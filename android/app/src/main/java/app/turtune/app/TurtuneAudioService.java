package app.turtune.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

/**
 * Servicio foreground que mantiene la reproducci??n de audio en segundo plano.
 * Gestiona la cola nativamente (auto-avance, next/prev desde la notificaci??n)
 * para que funcione aunque el WebView est?? suspendido por Android.
 */
public class TurtuneAudioService extends Service {

    public static final String CHANNEL_ID = "turtune_audio";
    public static final int NOTIF_ID = 1001;

    public static final String ACTION_PLAY = "app.turtune.app.ACTION_PLAY";
    public static final String ACTION_PLAY_QUEUE = "app.turtune.app.ACTION_PLAY_QUEUE";
    public static final String ACTION_PAUSE = "app.turtune.app.ACTION_PAUSE";
    public static final String ACTION_RESUME = "app.turtune.app.ACTION_RESUME";
    public static final String ACTION_STOP = "app.turtune.app.ACTION_STOP";
    public static final String ACTION_SEEK = "app.turtune.app.ACTION_SEEK";
    public static final String ACTION_PREVIOUS = "app.turtune.app.ACTION_PREVIOUS";
    public static final String ACTION_NEXT = "app.turtune.app.ACTION_NEXT";
    public static final String ACTION_SET_VOLUME = "app.turtune.app.ACTION_SET_VOLUME";
    public static final String EXTRA_URL = "url";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_THUMB = "thumb";
    public static final String EXTRA_SEEK_POS = "seekPos";
    public static final String EXTRA_VOLUME = "volume";

    public static class TrackInfo {
        public final String url;
        public final String title;
        public final String artist;
        public final String thumbnail;
        public TrackInfo(String url, String title, String artist, String thumbnail) {
            this.url = url;
            this.title = title;
            this.artist = artist;
            this.thumbnail = thumbnail;
        }
    }

    public interface AudioListener {
        void onProgress(long currentTime, long duration);
        void onStateChange(boolean isPlaying);
        void onTrackChanged(int index, TrackInfo track);
        void onTrackEnd();
        void onError(String message);
    }

    public static TurtuneAudioService instance = null;
    public static AudioListener listener = null;
    public static TrackInfo currentTrack = null;

    private ExoPlayer exoPlayer;
    private MediaSession mediaSession;
    private NotificationManager notificationManager;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private boolean hasAudioFocus = false;

    // Cola nativa
    private final List<TrackInfo> queue = new ArrayList<>();
    private int currentIndex = 0;
    private boolean repeatAll = false;
    private boolean repeatOne = false;
    private boolean shuffle = false;

    private final java.util.concurrent.ScheduledExecutorService progressExecutor =
            Executors.newSingleThreadScheduledExecutor();

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        createNotificationChannel();

        exoPlayer = new ExoPlayer.Builder(this).build();
        exoPlayer.addListener(new Player.Listener() {
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                if (listener != null) listener.onStateChange(isPlaying);
                updateNotification();
            }

            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_ENDED) {
                    handleTrackEnded();
                }
            }

            @Override
            public void onPlayerError(androidx.media3.common.PlaybackException error) {
                if (listener != null) listener.onError(error.getMessage() != null ? error.getMessage() : "Error de reproducci??n");
            }
        });

        mediaSession = new MediaSession.Builder(this, exoPlayer).build();

        startProgressLoop();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;
        String action = intent.getAction();
        if (ACTION_PLAY.equals(action)) {
            String url = intent.getStringExtra(EXTRA_URL);
            String title = intent.getStringExtra(EXTRA_TITLE);
            String artist = intent.getStringExtra(EXTRA_ARTIST);
            String thumb = intent.getStringExtra(EXTRA_THUMB);
            if (url == null) return START_NOT_STICKY;
            if (title == null) title = "Sin t??tulo";
            if (artist == null) artist = "Artista desconocido";
            if (thumb == null) thumb = "";
            // Cola de una sola pista
            queue.clear();
            queue.add(new TrackInfo(url, title, artist, thumb));
            currentIndex = 0;
            playCurrent();
        } else if (ACTION_PLAY_QUEUE.equals(action)) {
            // Cola completa (enviada por JS)
            // Cola completa (enviada por JS) -- arrays paralelos
            String[] urls = intent.getStringArrayExtra("urls");
            String[] titles = intent.getStringArrayExtra("titles");
            String[] artists = intent.getStringArrayExtra("artists");
            String[] thumbs = intent.getStringArrayExtra("thumbs");
            int startIndex = intent.getIntExtra("startIndex", 0);
            boolean rAll = intent.getBooleanExtra("repeatAll", false);
            boolean rOne = intent.getBooleanExtra("repeatOne", false);
            boolean shuf = intent.getBooleanExtra("shuffle", false);
            if (urls != null && urls.length > 0) {
                queue.clear();
                for (int i = 0; i < urls.length; i++) {
                    queue.add(new TrackInfo(
                        urls[i],
                        (titles != null && i < titles.length) ? titles[i] : "Sin titulo",
                        (artists != null && i < artists.length) ? artists[i] : "Artista desconocido",
                        (thumbs != null && i < thumbs.length) ? thumbs[i] : ""
                    ));
                }
                currentIndex = Math.max(0, Math.min(startIndex, queue.size() - 1));
                repeatAll = rAll;
                repeatOne = rOne;
                shuffle = shuf;
                playCurrent();
                requestAudioFocus();
            }
        } else if (ACTION_PAUSE.equals(action)) {
            if (exoPlayer != null) exoPlayer.pause();
        } else if (ACTION_RESUME.equals(action)) {
            if (exoPlayer != null) exoPlayer.play();
        } else if (ACTION_STOP.equals(action)) {
            stopPlayback();
        } else if (ACTION_SEEK.equals(action)) {
            long pos = intent.getLongExtra(EXTRA_SEEK_POS, 0);
            if (exoPlayer != null) exoPlayer.seekTo(pos);
        } else if (ACTION_PREVIOUS.equals(action)) {
            playPrevious();
        } else if (ACTION_NEXT.equals(action)) {
            playNext();
        } else if (ACTION_SET_VOLUME.equals(action)) {
            float v = intent.getFloatExtra(EXTRA_VOLUME, 1.0f);
            if (exoPlayer != null) exoPlayer.setVolume(v);
        }
        return START_STICKY;
    }

    private void playCurrent() {
        if (queue.isEmpty() || currentIndex < 0 || currentIndex >= queue.size()) return;
        TrackInfo track = queue.get(currentIndex);
        MediaItem mediaItem = MediaItem.fromUri(Uri.parse(track.url));
        exoPlayer.setMediaItem(mediaItem);
        exoPlayer.prepare();
        exoPlayer.play();

        if (listener != null) listener.onTrackChanged(currentIndex, track);
        startForeground(NOTIF_ID, buildNotification(track.title, track.artist, true, track.thumbnail));
    }

    private void handleTrackEnded() {
        if (repeatOne) {
            exoPlayer.seekTo(0);
            exoPlayer.play();
            return;
        }
        if (currentIndex + 1 < queue.size()) {
            currentIndex++;
            playCurrent();
        } else if (repeatAll && !queue.isEmpty()) {
            currentIndex = 0;
            playCurrent();
        } else {
            // Fin de cola: parar
            if (listener != null) listener.onTrackEnd();
            stopForeground(STOP_FOREGROUND_REMOVE);
            if (exoPlayer != null) exoPlayer.stop();
        }
    }

    public void playNext() {
        if (queue.isEmpty()) return;
        if (shuffle && queue.size() > 1) {
            int next;
            do { next = (int) (Math.random() * queue.size()); } while (next == currentIndex);
            currentIndex = next;
        } else if (currentIndex + 1 < queue.size()) {
            currentIndex++;
        } else if (repeatAll) {
            currentIndex = 0;
        } else {
            // No hay siguiente: pausar y notificar fin
            if (exoPlayer != null) exoPlayer.pause();
            if (listener != null) listener.onTrackEnd();
            return;
        }
        playCurrent();
    }

    public void playPrevious() {
        if (queue.isEmpty()) return;
        // Si lleva >4s reproducidos, reiniciar la pista
        if (exoPlayer != null && exoPlayer.getCurrentPosition() > 4000) {
            exoPlayer.seekTo(0);
            return;
        }
        if (currentIndex > 0) {
            currentIndex--;
        } else if (repeatAll) {
            currentIndex = queue.size() - 1;
        } else {
            // Reiniciar la pista actual
            if (exoPlayer != null) exoPlayer.seekTo(0);
            return;
        }
        playCurrent();
    }

    public void updateQueue(List<TrackInfo> newQueue) {
        if (newQueue == null) return;
        // Mantener el ??ndice actual si la pista sigue en la cola
        String currentId = (currentIndex >= 0 && currentIndex < queue.size()) ? queue.get(currentIndex).url : null;
        queue.clear();
        queue.addAll(newQueue);
        if (currentId != null) {
            for (int i = 0; i < queue.size(); i++) {
                if (queue.get(i).url.equals(currentId)) { currentIndex = i; break; }
            }
        }
        if (currentIndex >= queue.size()) currentIndex = Math.max(0, queue.size() - 1);
    }

    public void setRepeatMode(boolean all, boolean one) {
        repeatAll = all;
        repeatOne = one;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Turtune ??? Reproducci??n", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Controles de reproducci??n en la barra de notificaciones");
            channel.setShowBadge(false);
            if (notificationManager != null) notificationManager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String title, String artist, boolean isPlaying, String thumb) {
        Intent playPauseIntent = new Intent(this, TurtuneAudioService.class);
        playPauseIntent.setAction(isPlaying ? ACTION_PAUSE : ACTION_RESUME);
        PendingIntent playPausePi = PendingIntent.getService(this, 1, playPauseIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent prevIntent = new Intent(this, TurtuneAudioService.class);
        prevIntent.setAction(ACTION_PREVIOUS);
        PendingIntent prevPi = PendingIntent.getService(this, 2, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent nextIntent = new Intent(this, TurtuneAudioService.class);
        nextIntent.setAction(ACTION_NEXT);
        PendingIntent nextPi = PendingIntent.getService(this, 3, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Bitmap largeIcon = loadBitmap(thumb);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(artist)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setLargeIcon(largeIcon)
                .addAction(android.R.drawable.ic_media_previous, "Anterior", prevPi)
                .addAction(isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        isPlaying ? "Pausar" : "Reproducir", playPausePi)
                .addAction(android.R.drawable.ic_media_next, "Siguiente", nextPi)
                .setOngoing(isPlaying)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        return builder.build();
    }

    private void updateNotification() {
        if (currentTrack == null || queue.isEmpty() || currentIndex < 0 || currentIndex >= queue.size()) return;
        TrackInfo t = queue.get(currentIndex);
        boolean playing = exoPlayer != null && exoPlayer.isPlaying();
        notificationManager.notify(NOTIF_ID, buildNotification(t.title, t.artist, playing, t.thumbnail));
    }

    private Bitmap loadBitmap(String url) {
        if (url == null || url.isEmpty()) return null;
        try {
            return BitmapFactory.decodeStream(new URL(url).openStream());
        } catch (Exception e) {
            return null;
        }
    }

    private void startProgressLoop() {
        final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
        Runnable runnable = new Runnable() {
            @Override
            public void run() {
                if (exoPlayer != null && exoPlayer.isPlaying()) {
                    long pos = exoPlayer.getCurrentPosition();
                    long dur = exoPlayer.getDuration();
                    if (dur < 0) dur = 0;
                    if (listener != null) listener.onProgress(pos, dur);
                }
                handler.postDelayed(this, 1000);
            }
        };
        handler.post(runnable);
    }

    // Audio focus
    private void requestAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attrs)
                    .setOnAudioFocusChangeListener(this::onAudioFocusChange)
                    .build();
            hasAudioFocus = audioManager.requestAudioFocus(audioFocusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        } else {
            int r = audioManager.requestAudioFocus(this::onAudioFocusChange, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            hasAudioFocus = (r == AudioManager.AUDIOFOCUS_REQUEST_GRANTED);
        }
    }

    private void abandonAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
        } else {
            audioManager.abandonAudioFocus(this::onAudioFocusChange);
        }
        hasAudioFocus = false;
    }

    private void onAudioFocusChange(int focusChange) {
        switch (focusChange) {
            case AudioManager.AUDIOFOCUS_LOSS:
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                if (exoPlayer != null && exoPlayer.isPlaying()) exoPlayer.pause();
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                if (exoPlayer != null) exoPlayer.setVolume(0.3f);
                break;
            case AudioManager.AUDIOFOCUS_GAIN:
                if (exoPlayer != null) {
                    exoPlayer.setVolume(1.0f);
                    exoPlayer.play();
                }
                break;
        }
    }

    public static void pause() {
        if (instance != null) new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> { if (instance != null && instance.exoPlayer != null) instance.exoPlayer.pause(); });
    }

    public static void resume() {
        if (instance != null) new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> { if (instance != null && instance.exoPlayer != null) instance.exoPlayer.play(); });
    }

    public static void stop() {
        if (instance != null) new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> { if (instance != null) instance.stopPlayback(); });
    }

    public static void seekTo(long pos) {
        if (instance != null) new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> { if (instance != null && instance.exoPlayer != null) instance.exoPlayer.seekTo(pos); });
    }

    public static void setVolume(float v) {
        if (instance != null) new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> { if (instance != null && instance.exoPlayer != null) instance.exoPlayer.setVolume(v); });
    }

    public static void next() {
        if (instance != null) new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> { if (instance != null) instance.playNext(); });
    }

    public static void previous() {
        if (instance != null) new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> { if (instance != null) instance.playPrevious(); });
    }

    public static void playSingle(Context context, TrackInfo track) {
        if (instance != null) {
            new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                if (instance != null) {
                    instance.queue.clear();
                    instance.queue.add(track);
                    instance.currentIndex = 0;
                    instance.repeatAll = false;
                    instance.repeatOne = false;
                    instance.shuffle = false;
                    instance.playCurrent();
                    instance.requestAudioFocus();
                }
            });
            return;
        }
        Intent intent = new Intent(context, TurtuneAudioService.class);
        intent.setAction(ACTION_PLAY);
        intent.putExtra(EXTRA_URL, track.url);
        intent.putExtra(EXTRA_TITLE, track.title);
        intent.putExtra(EXTRA_ARTIST, track.artist);
        intent.putExtra(EXTRA_THUMB, track.thumbnail);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void playQueue(Context context, String[] urls, String[] titles, String[] artists, String[] thumbs, int startIndex, boolean rAll, boolean rOne, boolean shuf) {
        if (instance != null) {
            new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                if (instance != null) {
                    instance.queue.clear();
                    for (int i = 0; i < urls.length; i++) {
                        instance.queue.add(new TrackInfo(
                            urls[i],
                            (titles != null && i < titles.length) ? titles[i] : "Sin titulo",
                            (artists != null && i < artists.length) ? artists[i] : "Artista desconocido",
                            (thumbs != null && i < thumbs.length) ? thumbs[i] : ""
                        ));
                    }
                    instance.currentIndex = Math.max(0, Math.min(startIndex, instance.queue.size() - 1));
                    instance.repeatAll = rAll;
                    instance.repeatOne = rOne;
                    instance.shuffle = shuf;
                    instance.playCurrent();
                    instance.requestAudioFocus();
                }
            });
            return;
        }
        Intent intent = new Intent(context, TurtuneAudioService.class);
        intent.setAction(ACTION_PLAY_QUEUE);
        intent.putExtra("urls", urls);
        intent.putExtra("titles", titles);
        intent.putExtra("artists", artists);
        intent.putExtra("thumbs", thumbs);
        intent.putExtra("startIndex", startIndex);
        intent.putExtra("repeatAll", rAll);
        intent.putExtra("repeatOne", rOne);
        intent.putExtra("shuffle", shuf);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }


    private void stopPlayback() {
        if (exoPlayer != null) {
            exoPlayer.stop();
            exoPlayer.clearMediaItems();
        }
        abandonAudioFocus();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
        currentTrack = null;
        if (listener != null) listener.onStateChange(false);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        progressExecutor.shutdownNow();
        if (exoPlayer != null) exoPlayer.release();
        if (mediaSession != null) mediaSession.release();
        instance = null;
    }
}
