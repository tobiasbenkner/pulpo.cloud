# Create User
```bash
adduser --disabled-password deployer
groupadd web-deploy
usermod -aG web-deploy deployer
```

# Setup SSH Keys
```bash
su deployer
cd ~

# Create Keys
ssh-keygen

# Add Public key to authorized_keys
cat .ssh/id_ed25519.pub >> .ssh/authorized_keys
exit
```

# Setup SSH Keys
```bash
nano /etc/ssh/sshd_config.d/deployer.conf
Match User deployer
    PasswordAuthentication no
    PermitRootLogin no
    AllowAgentForwarding no
    AllowTcpForwarding no
    X11Forwarding no
```

# Configure Permissions
```bash
chown -R deployer:web-deploy /srv/web-deploy/www
chown -R deployer:web-deploy /srv/web-deploy/www-traefik

chmod -R 775 /srv/web-deploy/www
chmod -R 775 /srv/web-deploy/www-traefik
```

Docker
```bash
sudo find www -type d -exec chmod g+s {} +
sudo find traefik_dynamic -type d -exec chmod g+s {} +
```

# test
```bash
su deployer
ssh deployer@example.com
touch /srv/web-deploy/www/test.txt
```