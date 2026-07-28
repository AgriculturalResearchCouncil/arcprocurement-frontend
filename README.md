# Arcprocurement Frontend

![ARC](https://img.shields.io/badge/Organization-ARC-green)
![Status](https://img.shields.io/badge/Status-Production-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)

## Overview
Enterprise-ready ARC repository documentation.

## Architecture Diagram
```text
Frontend -> API -> Auth Service -> Database
```

## Screenshots
Place screenshots under `/docs/images/`.

## Technology Stack
- Angular/Ionic

## Environment Variables
```env
APP_PORT=3000
DB_HOST=localhost
JWT_SECRET=change_me
```

## Docker Deployment
```bash
docker build -t arcprocurement-frontend .
docker run -d arcprocurement-frontend
```

## PM2 Deployment
```bash
pm install -g pm2
pm2 start ecosystem.config.js
```

## API Documentation
Swagger/OpenAPI: `/api/docs`

## Release History
| Version | Notes |
|----------|-------|
| 1.0.0 | Initial Release |

## Support
Agricultural Research Council (ARC) ICT

## License
Copyright © Agricultural Research Council (ARC). All Rights Reserved.
