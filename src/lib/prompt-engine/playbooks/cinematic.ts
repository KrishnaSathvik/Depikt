import type { Playbook } from "./index.ts";

export const cinematic: Playbook = {
  id: "cinematic",
  title: "Cinematic / scene / portrait",
  guidance: `Describe one clear image: subject (who/what, with the two or three physical details that matter), action or pose, environment and time of day, composition and perspective (framing, distance, angle, where the subject sits in the frame), light (source, direction, quality, color), atmosphere (weather, haze, particles), and materials or textures that will be visible.
Camera and lens vocabulary is optional. Use it only when it changes the picture (a long lens for compressed backgrounds, a wide lens for exaggerated depth, shallow focus to isolate). Never add focal lengths, apertures, ISO, or camera brands as decoration.
Name the medium once (photograph, film still, painterly illustration) and keep every other choice consistent with it.
If the user gave a ratio, state it. Otherwise do not invent one unless the deliverable clearly implies it.`,
};
