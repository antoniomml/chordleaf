export function youtubeURL(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Introduce un enlace de YouTube válido.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new Error("Introduce un enlace HTTPS de YouTube.");
  let id;
  if (url.hostname === "youtu.be") id = url.pathname.slice(1);
  else if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "music.youtube.com",
    ].includes(url.hostname)
  ) {
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)$/)?.[1];
  }
  if (!/^[\w-]{11}$/.test(id || ""))
    throw new Error("Introduce el enlace de un vídeo de YouTube.");
  return "https://www.youtube.com/watch?v=" + id;
}

// The video track is required by the browser's picker, but is never recorded.
// Every granted track is stopped, including on cancellation and codec errors.
export function recordTabAudio(
  stream,
  onSize = () => {},
  Recorder = MediaRecorder,
  Stream = MediaStream,
) {
  const stopTracks = () => stream.getTracks().forEach((track) => track.stop());
  const audio = stream.getAudioTracks();
  if (!audio.length) {
    stopTracks();
    throw new Error(
      "No se ha compartido audio. Usa Chrome o Edge, elige una pestaña y activa Compartir audio.",
    );
  }
  let recorder;
  try {
    const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
      (t) => Recorder.isTypeSupported(t),
    );
    if (!type)
      throw new Error(
        "Este navegador no permite grabar el audio de una pestaña.",
      );
    recorder = new Recorder(new Stream(audio), {
      mimeType: type,
      audioBitsPerSecond: 128000,
    });
  } catch (error) {
    stopTracks();
    throw error;
  }
  let cancelled = false,
    bytes = 0,
    timer;
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    recorder.ondataavailable = ({ data }) => {
      if (data.size) {
        chunks.push(data);
        bytes += data.size;
        onSize(bytes);
        if (bytes > 30 * 1024 * 1024) finish();
      }
    };
    recorder.onerror = () => {
      clearTimeout(timer);
      stopTracks();
      reject(new Error("No se pudo grabar el audio de la pestaña."));
    };
    recorder.onstop = () => {
      clearTimeout(timer);
      stopTracks();
      cancelled
        ? resolve(null)
        : bytes > 30 * 1024 * 1024
          ? reject(new Error("El audio supera 30 MB."))
          : resolve(new Blob(chunks, { type: recorder.mimeType }));
    };
  });
  const finish = () => {
    if (recorder.state !== "inactive") recorder.stop();
  };
  for (const track of stream.getTracks())
    track.addEventListener("ended", finish, { once: true });
  try {
    recorder.start(1000);
    timer = setTimeout(finish, 600000);
  } catch (error) {
    stopTracks();
    throw error;
  }
  return {
    done,
    finish,
    cancel() {
      cancelled = true;
      finish();
      stopTracks();
    },
  };
}
