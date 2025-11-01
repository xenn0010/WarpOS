import osjs from 'osjs';
import {name as applicationName} from './metadata.json';

const register = (core, args, options, metadata) => {
  const proc = core.make('osjs/application', {
    args,
    options,
    metadata
  });

  proc.createWindow({
    id: 'ReplitWindow',
    title: metadata.title.en_EN,
    dimension: {width: 900, height: 600},
    position: {left: 100, top: 100}
  })
    .on('destroy', () => proc.destroy())
    .render(($content, win) => {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://replit.com';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      $content.appendChild(iframe);
    });

  return proc;
};

osjs.register(applicationName, register);
