import fs from 'fs';
import https from 'https';
import child_process from 'child_process';

const zipUrl = 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip';
const zipPath = './ngrok.zip';

console.log('Downloading latest ngrok.exe...');
const file = fs.createWriteStream(zipPath);

https.get(zipUrl, (res) => {
  res.pipe(file);
  file.on('finish', () => {
    file.close(() => {
      console.log('Download finished. Unzipping...');
      child_process.execSync('powershell -command "Expand-Archive -Force -Path ./ngrok.zip -DestinationPath ./"');
      console.log('ngrok.exe successfully extracted!');
      fs.unlinkSync(zipPath);
    });
  });
}).on('error', (err) => {
  console.error('Download error:', err.message);
});
