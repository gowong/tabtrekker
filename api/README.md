**Server config:**  
- `ecosystem.json` - PM2 script used to start service  
  - `pm2 start ecosystem.json` - usually doesn't do anything since PM2 auto-restarts service
  - `pm2 restart ecosystem.json`
- `/etc/nginx/sites-enabled/default` - NGINX config  
  - `sudo service nginx restart` to apply changes  

**Logs:**  
- `pm2 logs` - PM2 logs
- `/home/tabtrekker/logs` - Parse app logs

**Setup guide:**  
https://www.digitalocean.com/community/tutorials/how-to-migrate-a-parse-app-to-parse-server-on-ubuntu-14-04