package app.turtune.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Puente Capacitor ??? TurtuneAudioService (ExoPlayer foreground).
 * M??todos JS: play, pause, resume, stop, seek, setVolume
 * Eventos JS: progress, stateChange, ended, error
 */
@CapacitorPlugin(name = "TurtuneAudio")
public class TurtuneAudioPlugin extends Plugin {

    @Override
    public void load() {
        TurtuneAudioService.listener = new TurtuneAudioService.AudioListener() {
            @Override
            public void onProgress(long currentTime, long duration) {
                JSObject data = new JSObject();
                data.put("currentTime", currentTime / 1000.0);
                data.put("duration", duration / 1000.0);
                notifyListeners("progress", data);
            }

            @Override
            public void onStateChange(boolean isPlaying) {
                JSObject data = new JSObject();
                data.put("isPlaying", isPlaying);
                notifyListeners("stateChange", data);
            }

            @Override
            public void onTrackChanged(int index, TurtuneAudioService.TrackInfo track) {
                JSObject data = new JSObject();
                data.put("index", index);
                data.put("id", track.url); // placeholder ??? JS will match by position
                data.put("title", track.title);
                data.put("artist", track.artist);
                data.put("thumbnail", track.thumbnail);
                notifyListeners("trackChanged", data);
            }

            @Override
            public void onTrackEnd() {
                notifyListeners("ended", new JSObject());
            }


            @Override
            public void onError(String message) {
                JSObject data = new JSObject();
                data.put("message", message);
                notifyListeners("error", data);
            }
        };
    }

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        String title = call.getString("title", "Sin t??tulo");
        String artist = call.getString("artist", "Artista desconocido");
        String thumbnail = call.getString("thumbnail", "");
        if (url == null || url.isEmpty()) {
            call.reject("url requerida");
            return;
        }
        TurtuneAudioService.TrackInfo track = new TurtuneAudioService.TrackInfo(url, title, artist, thumbnail);
        TurtuneAudioService.playSingle(getContext(), track);
        call.resolve();
    }

    @PluginMethod
    public void playQueue(PluginCall call) {
        try {
            org.json.JSONArray urlsArr = call.getArray("urls");
            if (urlsArr == null || urlsArr.length() == 0) { call.reject("urls vac??o"); return; }
            int startIndex = call.getInt("startIndex", 0);
            boolean rAll = call.getBoolean("repeatAll", false);
            boolean rOne = call.getBoolean("repeatOne", false);
            boolean shuf = call.getBoolean("shuffle", false);

            org.json.JSONArray titlesArr = call.getArray("titles");
            org.json.JSONArray artistsArr = call.getArray("artists");
            org.json.JSONArray thumbsArr = call.getArray("thumbnails");

            String[] urls = new String[urlsArr.length()];
            String[] titles = new String[urlsArr.length()];
            String[] artists = new String[urlsArr.length()];
            String[] thumbs = new String[urlsArr.length()];

            for (int i = 0; i < urlsArr.length(); i++) {
                urls[i] = urlsArr.getString(i);
                titles[i] = (titlesArr != null && i < titlesArr.length()) ? titlesArr.getString(i) : "Sin t??tulo";
                artists[i] = (artistsArr != null && i < artistsArr.length()) ? artistsArr.getString(i) : "Artista desconocido";
                thumbs[i] = (thumbsArr != null && i < thumbsArr.length()) ? thumbsArr.getString(i) : "";
            }

            TurtuneAudioService.playQueue(getContext(), urls, titles, artists, thumbs, startIndex, rAll, rOne, shuf);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error procesando la cola: " + e.getMessage());
        }
    }

    @PluginMethod
    public void pause(PluginCall call) {
        TurtuneAudioService.pause();
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        TurtuneAudioService.resume();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        TurtuneAudioService.stop();
        call.resolve();
    }

    @PluginMethod
    public void next(PluginCall call) {
        TurtuneAudioService.next();
        call.resolve();
    }

    @PluginMethod
    public void previous(PluginCall call) {
        TurtuneAudioService.previous();
        call.resolve();
    }
    @PluginMethod
    public void seek(PluginCall call) {
        Double pos = call.getDouble("position");
        if (pos == null) { call.reject("position requerida"); return; }
        TurtuneAudioService.seekTo((long) (pos * 1000));
        call.resolve();
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Double v = call.getDouble("volume");
        if (v == null) { call.reject("volume requerido"); return; }
        TurtuneAudioService.setVolume((float) (double) v);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        TurtuneAudioService.listener = null;
        super.handleOnDestroy();
    }
}
