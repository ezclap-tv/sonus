import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import type { Player } from "../core/player";

const Play = ({ sound, player }: { sound: string; player: Player }) => {
  const [playing, setPlaying] = useState(false);

  const play = useCallback(() => player.play(sound), [sound, player]);
  const stop = useCallback(
    () => player.playing === sound && player.stop(),
    [sound, player],
  );

  useEffect(() => {
    const onPlay = (which: string) => sound === which && setPlaying(true);
    const onStop = (which: string) => sound === which && setPlaying(false);
    player.on("play", onPlay);
    player.on("stop", onStop);
    return () => {
      player.off("play", onPlay);
      player.off("stop", onStop);
    };
  }, [sound, player]);

  return (
    <button onClick={playing ? stop : play}>
      {playing ? "⏹" : "▶️"} {sound}
    </button>
  );
};

export default Play;
