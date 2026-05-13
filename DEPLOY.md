# Deploy notes

## Nginx example for `seo.setai.no`

```nginx
server {
    listen 80;
    server_name seo.setai.no;

    root /var/www/setai/seo;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

This serves the static microsite files from the `seo/` folder.
