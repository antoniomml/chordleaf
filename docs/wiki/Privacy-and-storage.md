# Privacy and storage

[← Back to Chordleaf](https://github.com/antoniomml/chordleaf)

Chordleaf has no accounts, analytics scripts or advertising integrations. Song editing, local file imports and exports run in your browser. Interface and document fonts are served by the same site.

Open and closed songs are saved together in `localStorage` under `chordleaf-v1`; the interface language is stored under `chordleaf-language`. The former `chordleaf-recent-v1` list and legacy Chordi keys are read to migrate existing data. Closed songs remain in **Recent** until you explicitly remove them; **View all** exposes the complete list. Active sheet edits are included in autosave, and Escape restores the value from before editing. Storage is local to that browser and website origin. It is not encrypted by Chordleaf, synchronized, or a backup. Anyone with access to that browser profile may be able to read it. Export editable `.chordleaf.json` projects or workspace JSON backups of important songs and remove the site's stored data through browser settings when you want to delete the workspace.

Web import sends the supplied URL to `/api/import-web`. The server downloads the public page from an allowlisted provider and returns it to your browser for text extraction. It does not receive your edited song or local files and does not forward browser cookies or authentication credentials to that provider. The hosting provider and remote site receive normal request metadata; URLs and IP addresses may appear in infrastructure logs. Operators should review their hosting log retention regularly. No application database stores imported pages.

Web pages, PDFs and Word documents can contain material that you should not share publicly. Use short invented examples in bug reports and keep exported songs and recovery files private unless you intend to share them.

Changing the interface language preserves song content. Clearing browser storage or changing domains can remove access to the working copy. Only one browser tab can own the workspace at a time; another tab offers **Use here**. The current editor saves before handing over; if saving fails, return to that tab and export your work before retrying. Full workspace JSON backups include open and closed songs and settings, remain available with all songs closed and stay on your device.
