/*
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2020, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

//
// This is the server configuration tree.
// Guide: https://manual.os-js.org/config/#server
// Complete config tree: https://github.com/os-js/osjs-server/blob/master/src/config.js
//

const path = require('path');
const root = path.resolve(__dirname, '../../');

module.exports = {
  root,
  port: 8000,
  public: path.resolve(root, 'dist'),
  
  // Settings configuration
  settings: {
    // Storage adapter for server-side settings
    adapter: 'fs',
    // Settings file location
    file: path.resolve(root, 'settings.json')
  },
  
  // VFS (Virtual File System) Configuration
  // This enables local file management in WarpOS
  vfs: {
    // Root directory where all VFS mounts will be based
    root: path.resolve(root, 'vfs'),
    
    // Mount points map virtual paths to real filesystem locations
    // Users access these through virtual paths like "home:/" or "documents:/"
    mounts: [
      {
        // Virtual mount point name (appears as "home:/" in file manager)
        name: 'home',
        label: 'Home',
        // Real filesystem path this mount points to
        adapter: 'local',
        attributes: {
          // For security, restrict to a specific directory
          root: path.resolve(root, 'vfs/home')
        },
        // Permissions for this mount
        permissions: {
          read: true,
          write: true,
          execute: true,
          create: true,
          delete: true
        }
      },
      {
        name: 'documents',
        label: 'Documents',
        adapter: 'local',
        attributes: {
          root: path.resolve(root, 'vfs/documents')
        },
        permissions: {
          read: true,
          write: true,
          execute: false,
          create: true,
          delete: true
        }
      },
      {
        name: 'downloads',
        label: 'Downloads',
        adapter: 'local',
        attributes: {
          root: path.resolve(root, 'vfs/downloads')
        },
        permissions: {
          read: true,
          write: true,
          execute: false,
          create: true,
          delete: true
        }
      },
      {
        name: 'desktop',
        label: 'Desktop',
        adapter: 'local',
        attributes: {
          root: path.resolve(root, 'vfs/desktop')
        },
        permissions: {
          read: true,
          write: true,
          execute: true,
          create: true,
          delete: true
        }
      },
      {
        // Demo mount point with read-only access
        name: 'demo',
        label: 'Demo Files',
        adapter: 'local',
        attributes: {
          root: path.resolve(root, 'vfs/demo')
        },
        permissions: {
          read: true,
          write: false,
          execute: false,
          create: false,
          delete: false
        }
      }
    ],
    
    // Global VFS settings
    options: {
      // Maximum file size for uploads (50MB)
      maxUploadSize: 50 * 1024 * 1024,
      // Allowed file extensions (empty = all allowed)
      allowedExtensions: [],
      // Disallowed file extensions (for security)
      disallowedExtensions: ['.exe', '.bat', '.sh', '.app'],
      // Whether to show hidden files (starting with .)
      showHiddenFiles: false,
      // File permissions mode (Unix-style)
      defaultPermissions: {
        read: true,
        write: true,
        execute: false
      }
    }
  }
};
