# Theme Studio

A native desktop customization manager for Linux (GNOME Desktop). Easily browse, install, configure, and switch GTK themes, Shell themes, icon packs, cursor themes, GNOME Shell extensions, desktop tweaks, and GDM Login / Lock Screen styles.

---

## Features

- **Themes & Shell Themes**: Install top community themes (Orchis, WhiteSur, Fluent, Catppuccin, Gruvbox, etc.) with automatic variant selection (dark/light, compact/standard, accent colors).
- **Icons & Cursors**: One-click install for Tela, Candy, Reversal, Bibata, Apple Cursors, and more.
- **Extensions Store**: Real-time integration with `extensions.gnome.org` (100+ extensions searchable and installable directly).
- **Desktop Tweaks**: Interactive GNOME App Grid categorizer to organize your apps into clean folders (Internet, Development, Media, Graphics, Office, System, Utilities, Games).
- **Looks (Full Desktop Presets)**: Curated one-click desktop transformation presets.
- **GDM / Lock Screen Manager (Milestone 2)**:
  - Copy themes, icons, and backgrounds to `/usr/share/*` system directories.
  - Enable GSE-GDM Login Screen extension and apply Shell themes directly to the GDM login session.

---

## Development & Testing

```bash
# Install dependencies
npm install

# Launch Theme Studio in development mode
npm run dev

# Run automated integration and unit test suite
npm test
```

---

## GDM / Lock Screen Customization & Safety Recovery

GDM runs in an isolated system session as the `gdm` user. Theme Studio communicates with the GDM session using `pkexec` and `sudo -u gdm dbus-run-session`.

### Prerequisites for GDM Customization
For GNOME 42+ login screen styling, the **GSE-GDM Extension** is recommended:
```bash
git clone https://github.com/pratap-panabaka/gse-gdm-extension.git
cd gse-gdm-extension
sudo ./install.sh
```

### Emergency Recovery (If Login Screen Breaks)
If an incompatible theme causes the login screen to freeze or fail to render, you can immediately recover using either of the following:

#### Option 1: In App
Open **Theme Studio** > **Lock Screen** tab > Click **"Reset GDM Settings"** under Safety & Recovery.

#### Option 2: Terminal / TTY (Ctrl + Alt + F3)
Log in with your username and password, then execute:
```bash
# Reset GDM Shell Theme back to standard GNOME default
sudo -u gdm dbus-run-session gsettings reset org.gnome.shell.extensions.user-theme name

# Reset GDM Background back to standard default
sudo -u gdm dbus-run-session gsettings reset org.gnome.desktop.background picture-uri
sudo -u gdm dbus-run-session gsettings reset org.gnome.desktop.background picture-uri-dark

# (Optional) Reset GDM dconf database if needed
sudo dconf reset -f /org/gnome/
```
Then restart GDM:
```bash
sudo systemctl restart gdm
```
