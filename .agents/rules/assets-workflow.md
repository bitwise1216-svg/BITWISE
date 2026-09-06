# Asset & Reference Workflow Rule

## 1. Permanent Assets Directory (`assets/`)
- **Purpose**: Houses permanent website assets provided by the user (PNG, JPG, SVG, WebP, backgrounds, icons, photos).
- **Subdirectories**:
  - `assets/images/`: General photos, illustrations, content images.
  - `assets/backgrounds/`: Background textures, gradients, background imagery.
  - `assets/icons/`: UI icons and badges.
- **Rule**: Never delete files inside `assets/`. Always preserve them and reference them properly in the website code.

## 2. Reference / Examples Directory (`examples/`)
- **Purpose**: Temporary drop zone for ideas, inspiration, and reference media (e.g., MP4 screen recordings of animations from other sites, GIFs, UI mockups).
- **Workflow Steps**:
  1. **Inspect**: Whenever the user asks to implement something based on a reference or places a file here, inspect the video or media using `view_file`.
  2. **Replicate & Build**: Accurately translate the motion, physics, easing, and layout into code using the installed skills (`animate`, `emil-design-eng`, `apple-design`).
  3. **Verify**: Ensure the implementation is functional, responsive, and matches the intended look and feel.
  4. **Clean Up**: Once the feature is successfully implemented and integrated into the site, delete the temporary reference file from `examples/` so the folder stays clean.
