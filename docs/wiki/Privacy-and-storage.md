# Privacy and storage

[← Back to Chordleaf](https://github.com/antoniomml/chordleaf)

Chordleaf has no accounts, analytics scripts or advertising integrations. Song editing, local file imports and exports run in your browser. Interface and document fonts are served by the same site.

Open and closed songs are saved together in `localStorage` under `chordleaf-v1`; the interface language is stored under `chordleaf-language`. The former `chordleaf-recent-v1` list and legacy Chordi keys are read to migrate existing data. Closed songs remain in **Recent** until you explicitly remove them; **View all** exposes the complete list. Active sheet edits are included in autosave, and Escape restores the value from before editing. Storage is local to that browser and website origin. It is not encrypted by Chordleaf, synchronized, or a backup. Anyone with access to that browser profile may be able to read it. Export editable `.chordleaf.json` projects or workspace JSON backups of important songs and remove the site's stored data through browser settings when you want to delete the workspace.

Web import sends the supplied URL to `/api/import-web`. The server downloads the public page from an allowlisted provider and returns it to your browser for text extraction. It does not receive your edited song or local files and does not forward browser cookies or authentication credentials to that provider. The hosting provider and remote site receive normal request metadata; URLs and IP addresses may appear in infrastructure logs. Operators should review their hosting log retention regularly. No application database stores imported pages.

## Audio and model downloads

Browser audio import decodes and analyzes the selected recording on your device. The recording and generated transcription are not uploaded to Chordleaf or a transcription service. Selecting a file creates a local playback copy for the current import; recordings are not retained in the model cache or included in editable song projects. The resulting lyrics and chords become a normal locally saved song when analysis finishes.

Models download only after you request them. Chordleaf serves the chord detector and shared runtime; lyric-model files come from public Hugging Face repositories, which may redirect downloads to their file delivery hosts. These hosts receive ordinary download metadata such as your IP address and the requested model file, rather than your recording or lyrics. Downloads omit credentials and the page referrer. Imported recordings do not become training data through this feature.

Model files are kept in this site's browser cache, separately from saved songs and the offline application cache. **New song → Import audio → Models and settings → Delete** removes files for a particular model, including partially downloaded files. Deleting a lyric model preserves the chord detector, shared runtime and your songs. Clearing all site data also removes songs, preferences and cached models: export a workspace backup first. Workspace backups contain songs and settings, not recordings or model weights. See the [audio guide](https://github.com/antoniomml/chordleaf/wiki/Audio-import) for details.

## Sharing and moving your workspace

Removing a saved song from **Recent** opens a confirmation naming that song. **Cancel** preserves it; **Delete song** permanently removes the browser copy after a successful save. If that write fails, the song remains. Keep exported backups of important songs before deleting them.

Wait for **Offline: ready** before relying on the app without a connection. The active worker verifies that the currently open build and all its application resources are cached; failed installation is shown without blocking online editing. Clearing site data removes that cache as well. Uninstalling the web app does not guarantee deletion of its browser storage: use explicit site-data controls.

Web pages, PDFs and Word documents can contain material that you should not share publicly. Use short invented examples in bug reports and keep exported songs and recovery files private unless you intend to share them.

Changing the interface language preserves song content. Clearing browser storage or changing domains can remove access to the working copy. Only one browser tab can own the workspace at a time; another tab offers **Use here**. The current editor saves before handing over; if saving fails, return to that tab and export your work before retrying. Full workspace JSON backups include open and closed songs and settings, remain available with all songs closed and stay on your device.
