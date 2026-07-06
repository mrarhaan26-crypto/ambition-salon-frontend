# Clean Project Notes

This folder was cleaned from the uploaded archives.

## Kept

- `Backend_NestJS/`
- `Frontend_Angular/`
- `Documentation/`
- `docs/`
- root `AGENTS.md`
- root `BRAIN.md`
- root `start-ambition.ps1`

## Removed from final ZIP

- duplicate backend folders such as `Backend_NestJS - Copy/`
- old step folder `Backend_NestJS_Step21/`
- `node_modules/`
- build outputs `dist/`
- Angular cache `.angular/`
- Git folders `.git/`
- large nested ZIP/7z archives
- temporary/log files
- broken startup script

## Important

Run dependency install after extracting this clean ZIP:

```powershell
cd "C:\Users\mrzub\OneDrive\Ambition Unisex Salon Software\Backend_NestJS"
npm.cmd install

cd "C:\Users\mrzub\OneDrive\Ambition Unisex Salon Software\Frontend_Angular"
npm.cmd install
```

PostgreSQL must run on the port used in `Backend_NestJS/.env`.

Start backend:

```powershell
cd "C:\Users\mrzub\OneDrive\Ambition Unisex Salon Software\Backend_NestJS"
npx prisma generate
npm.cmd run start:dev
```

Start frontend:

```powershell
cd "C:\Users\mrzub\OneDrive\Ambition Unisex Salon Software\Frontend_Angular"
npm.cmd start
```

Open:

```text
http://localhost:4200
```
