# WarpOS Local File Management Guide

## Overview

WarpOS uses OS.js's Virtual File System (VFS) to provide secure, sandboxed access to local files. The VFS creates virtual mount points that map to real filesystem directories, allowing users to interact with files through a web interface while maintaining security boundaries.

## How It Works

### Architecture

```
Browser (Client)          Server (Node.js)         Filesystem
     |                           |                        |
     |  VFS API Request          |                        |
     |-------------------------->|                        |
     |                           |  Filesystem Operations |
     |                           |----------------------->|
     |                           |                        |
     |  Response (File Data)     |                        |
     |<--------------------------|                        |
```

1. **Client Side**: The File Manager application (`@osjs/filemanager-application`) provides a GUI for file operations
2. **VFS Service**: Handles file operations, path resolution, and permission checks
3. **Mount Points**: Virtual directories (e.g., `home:/`, `documents:/`) mapped to real filesystem paths
4. **Adapters**: Backend implementations for different storage types (local filesystem, cloud storage, etc.)

### Mount Points

Mount points are configured in `src/server/config.js` under the `vfs.mounts` array. Each mount defines:

- **Name**: Virtual path identifier (e.g., `home` → accessible as `home:/`)
- **Adapter**: Storage backend type (`local` for filesystem)
- **Attributes**: Configuration specific to the adapter (e.g., `root` path)
- **Permissions**: What operations are allowed (read, write, create, delete)

### Example Mount Configuration

```javascript
{
  name: 'home',
  label: 'Home',
  adapter: 'local',
  attributes: {
    root: '/path/to/vfs/home'
  },
  permissions: {
    read: true,
    write: true,
    execute: true,
    create: true,
    delete: true
  }
}
```

## Default Mount Points

WarpOS comes with several pre-configured mount points:

1. **`home:/`** - User's home directory (full access)
2. **`documents:/`** - Documents folder (read/write, no execute)
3. **`downloads:/`** - Downloads folder (read/write, no execute)
4. **`desktop:/`** - Desktop files (full access)
5. **`demo:/`** - Demo files (read-only)

All mount points are sandboxed to the `vfs/` directory by default for security.

## File Operations

The VFS supports standard file operations:

- **Read**: View file contents, list directories
- **Write**: Create, edit, save files
- **Delete**: Remove files and folders
- **Move/Copy**: File management operations
- **Upload**: Browser file uploads to mount points
- **Download**: Download files from mount points

### API Usage

Applications can interact with the VFS using the OS.js VFS API:

```javascript
// In an OS.js application
const {core} = this;

// List directory contents
const files = await core.make('osjs/vfs').readdir('home:/');

// Read file contents
const content = await core.make('osjs/vfs').readfile('home:/document.txt');

// Write file
await core.make('osjs/vfs').writefile('home:/document.txt', 'Hello World');

// Create directory
await core.make('osjs/vfs').mkdir('home:/newfolder');

// Delete file
await core.make('osjs/vfs').unlink('home:/oldfile.txt');

// Copy file
await core.make('osjs/vfs').copy('home:/source.txt', 'home:/dest.txt');

// Move file
await core.make('osjs/vfs').move('home:/oldname.txt', 'home:/newname.txt');
```

## Security Considerations

### 1. Path Sandboxing

**Always restrict mount points to specific directories:**

```javascript
// ✅ Good - Sandboxed to project directory
root: path.resolve(root, 'vfs/home')

// ❌ Bad - Could access entire filesystem
root: '/'
```

### 2. Permission Controls

Use granular permissions to limit what users can do:

```javascript
permissions: {
  read: true,    // Can view files
  write: false,  // Cannot modify files
  execute: false, // Cannot run executables
  create: false,  // Cannot create new files
  delete: false   // Cannot delete files
}
```

### 3. File Type Restrictions

Prevent dangerous file types:

```javascript
options: {
  disallowedExtensions: ['.exe', '.bat', '.sh', '.app', '.dmg'],
  maxUploadSize: 50 * 1024 * 1024  // 50MB limit
}
```

### 4. User Isolation

For multi-user systems, create per-user mount points:

```javascript
// User-specific home directories
attributes: {
  root: path.resolve(root, `vfs/users/${username}/home`)
}
```

## Adding New Mount Points

### Step 1: Update Server Config

Add a new mount to `src/server/config.js`:

```javascript
{
  name: 'projects',
  label: 'My Projects',
  adapter: 'local',
  attributes: {
    root: path.resolve(root, 'vfs/projects')
  },
  permissions: {
    read: true,
    write: true,
    execute: false,
    create: true,
    delete: true
  }
}
```

### Step 2: Create Directory

Create the physical directory:

```bash
mkdir -p OS.js/vfs/projects
```

### Step 3: Restart Server

Restart the OS.js server to apply changes:

```bash
npm run serve
```

The new mount will appear in the File Manager as `projects:/`.

## Advanced: Custom Mount Points

### Mounting System Directories (Linux)

⚠️ **Warning**: Only do this if you understand the security implications!

```javascript
{
  name: 'system',
  label: 'System Files',
  adapter: 'local',
  attributes: {
    root: '/usr/share'
  },
  permissions: {
    read: true,
    write: false,  // Read-only for safety
    execute: false,
    create: false,
    delete: false
  }
}
```

### Mounting Network Shares

OS.js supports various adapters. For cloud storage, you might use:

- `google-drive` - Google Drive integration
- `dropbox` - Dropbox integration
- `ftp` - FTP server access
- `webdav` - WebDAV server access

Check the OS.js documentation for adapter-specific configuration.

## Troubleshooting

### Files Not Appearing

1. Check that the mount point directory exists
2. Verify file permissions on the filesystem
3. Check server logs for errors
4. Ensure the mount is properly configured in `config.js`

### Permission Denied Errors

1. Check mount point permissions in config
2. Verify filesystem permissions (chmod)
3. Ensure the Node.js process has access to the directory

### Upload Failures

1. Check `maxUploadSize` in VFS options
2. Verify filesystem has enough space
3. Check server logs for error messages

## Client-Side File Access

For browser-based file operations (without server), OS.js can also use:

- **File System Access API**: Direct browser file access (Chrome/Edge)
- **File API**: File reading via input elements
- **IndexedDB**: Client-side storage

However, the VFS approach provides:
- ✅ Cross-browser compatibility
- ✅ Server-side security controls
- ✅ Consistent API across all storage backends
- ✅ User authentication and authorization

## Best Practices

1. **Always sandbox mount points** to specific directories
2. **Use read-only mounts** for shared/system directories
3. **Implement file size limits** to prevent abuse
4. **Restrict dangerous file types** (executables)
5. **Log file operations** for audit trails (optional)
6. **Use user-specific mounts** in multi-user environments
7. **Backup important data** regularly
8. **Monitor disk space** to prevent server issues

## Example: Complete File Manager Integration

The File Manager application (`@osjs/filemanager-application`) automatically:

- Lists all available mount points
- Provides drag-and-drop file operations
- Shows file previews
- Handles file uploads/downloads
- Supports keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)

Users interact with mounts through the GUI - no code required!

## Related Documentation

- [OS.js VFS Manual](https://manual.os-js.org/vfs/)
- [OS.js Server Config](https://github.com/os-js/osjs-server/blob/master/src/config.js)
- [File Manager Application](https://github.com/os-js/osjs/tree/master/packages/filemanager-application)

