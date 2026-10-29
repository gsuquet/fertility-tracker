# Version dialog

This page gives the rules for the **About & Version Tracker** dialog.

## Behavior

- The info button in the header, the **About & Version Tracker** item of the phone menu and the version button in the footer open the dialog.
- The **Release Notes** tab shows the newest release and the full history. Each old release opens and closes. Its header shows only the version and the date.
- The **System Information** tab shows the version, the CrMS version, the build date and the environment. It also has the repository link.
- The tab also shows the storage statistics: the number of storage keys, cycles and observations, and the size in KB.
- At the end, the tab shows the legal notice of the footer ([LegalNotice.tsx](../../../src/components/LegalNotice.tsx)): the trademark text, the medical text and the copyright. Thus, the installed application, which has no footer, also shows this text.
- The dialog uses the surface tokens `--bg-surface`, `--bg-primary` and `--bg-surface-border`.

## Accessibility

- No accessibility rule is specific to this dialog. The [dialog component](../dialog-component.md) gives the name, the focus trap and the focus return.

## Implementation

- [src/components/VersionModal.tsx](../../../src/components/VersionModal.tsx)

## Related documents

- [Version tracker](../version-tracker.md)
- [Application behavior](../application-behavior.md)
- [Dialog component](../dialog-component.md)
- [User interface](../user-interface.md)
