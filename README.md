# Pulpo.cloud

## Video

```bash
ffmpeg -i hero.mp4 -c:v libvpx-vp9 -crf 28 -b:v 0 -vf "scale='min(960,iw)':-1" -an hero.webm

ffmpeg -i hektor-original.mp4 -c:v libx264 -profile:v main -level 3.1 -crf 23 -preset slow -vf "scale='min(720,iw)':-2" -c:a aac -b:a 128k -movflags +faststart -y output.mp4

# 480 bei hochkant
ffmpeg -i hektor-original.mp4 -c:v libx264 -profile:v main -level 3.1 -crf 23 -preset slow -vf "scale='min(480,iw)':-2" -c:a aac -b:a 128k -movflags +faststart -y output.mp4
```
