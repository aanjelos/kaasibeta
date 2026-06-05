@echo off
echo Building Tailwind CSS...
tailwindcss.exe -i ./tailwind-input.css -o ../tailwind.css --minify
echo Done!
