@echo off
setlocal
set "FF=C:\Users\Oleg\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
set "VF=scale=1280:853:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='min(zoom+0.0008,1.15)':d=100:s=1280x720:fps=25,format=yuv420p"

mkdir video\ru 2>nul
mkdir video\en 2>nul

echo === RU ===
"%FF%" -y -loop 1 -i screenshots\legend.png      -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\ru\1.mp4
"%FF%" -y -loop 1 -i screenshots\game-mid.png    -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\ru\2.mp4
"%FF%" -y -loop 1 -i screenshots\meteor.png      -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\ru\3.mp4
"%FF%" -y -loop 1 -i screenshots\prestige.png    -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\ru\4.mp4
"%FF%" -y -loop 1 -i screenshots\offline-report.png -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\ru\5.mp4
"%FF%" -y -loop 1 -i screenshots\game.png        -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\ru\6.mp4

echo === EN ===
"%FF%" -y -loop 1 -i screenshots\en-legend.png   -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\en\1.mp4
"%FF%" -y -loop 1 -i screenshots\en-game-mid.png -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\en\2.mp4
"%FF%" -y -loop 1 -i screenshots\en-prestige.png -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\en\3.mp4
"%FF%" -y -loop 1 -i screenshots\en-offline.png  -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\en\4.mp4
"%FF%" -y -loop 1 -i screenshots\en-game.png     -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\en\5.mp4
"%FF%" -y -loop 1 -i screenshots\en-legend.png   -t 4 -vf "%VF%" -c:v libx264 -preset medium -crf 20 video\en\6.mp4

echo === CONCAT RU ===
(echo file '1.mp4'& echo file '2.mp4'& echo file '3.mp4'& echo file '4.mp4'& echo file '5.mp4'& echo file '6.mp4')> video\ru\list.txt
"%FF%" -y -f concat -safe 0 -i video\ru\list.txt -c copy video\new-dawn-ru.mp4

echo === CONCAT EN ===
(echo file '1.mp4'& echo file '2.mp4'& echo file '3.mp4'& echo file '4.mp4'& echo file '5.mp4'& echo file '6.mp4')> video\en\list.txt
"%FF%" -y -f concat -safe 0 -i video\en\list.txt -c copy video\new-dawn-en.mp4

echo === DONE ===
