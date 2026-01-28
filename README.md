# Pulpo.cloud

## Video

```bash
ffmpeg -i hero.mp4 -c:v libvpx-vp9 -crf 28 -b:v 0 -vf "scale='min(960,iw)':-1" -an hero.webm
```
