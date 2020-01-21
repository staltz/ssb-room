#!/bin/bash

cd ~

sudo apt update
sudo apt install -y docker.io curl dnsutils apt-transport-https ca-certificates software-properties-common unattended-upgrades nginx certbot python3-certbot-nginx

systemctl enable --now docker

echo 'Unattended-Upgrade::Automatic-Reboot "true";' >> /etc/apt/apt.conf.d/50unattended-upgrades
systemctl restart unattended-upgrades

#
# install ssb-room image
#
docker pull staltz/ssb-room

#
# create room container
#
mkdir ~/ssb-room-data
chown -R 1000:1000 ~/ssb-room-data

# create ./create-room script
cat > ./create-room <<EOF
#!/bin/bash
memory_limit=$(($(free -b --si | awk '/Mem\:/ { print $2 }') - 200*(10**6)))
docker run -d --name room \
   -v ~/ssb-room-data/:/home/node/.ssb/ \
   -p 127.0.0.1:8007:8007 \
   -p 8008:8008 \
   --restart unless-stopped \
   --memory "\$memory_limit" \
   staltz/ssb-room
EOF
# make the script executable
chmod +x ./create-room
# run the script
./create-room

# create ./room script
cat > ./room <<EOF
#!/bin/sh
docker exec -it room room "\$@"
EOF

# make the script executable
chmod +x ./room

#
# setup auto-healer
#
docker pull ahdinosaur/healer
docker run -d --name healer \
  -v /var/run/docker.sock:/tmp/docker.sock \
  --restart unless-stopped \
  ahdinosaur/healer

# ensure containers are always running
printf '#!/bin/sh\n\ndocker start room\n' | tee /etc/cron.hourly/room && chmod +x /etc/cron.hourly/room
printf '#!/bin/sh\n\ndocker start healer\n' | tee /etc/cron.hourly/healer && chmod +x /etc/cron.hourly/healer

# auto-update docker images for security
docker run -d \
    --name watchtower \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --restart unless-stopped \
    containrrr/watchtower

# WARNING: This method of converting an IP address to a domain name
#          allows the *wildcard DNS provider* to impersonate your service
#          even if HTTPS is used.

WILDCARD_DNSv4_SUFFIX="nip.io" # xip.io & sslip.io also exist
WILDCARD_DNSv6_SUFFIX="sslip.io" # only sslip.io has IPv6 support
PREFIX="ssb-room"
DOMAIN_V4=$(curl https://ipv4.wtfismyip.com/text 2>/dev/null | tr . - | sed s/\^/${PREFIX}./ | sed s/\$/.${WILDCARD_DNSv4_SUFFIX}/)
DOMAIN_V6=$(curl https://ipv6.wtfismyip.com/text 2>/dev/null | tr : - | sed s/\^/${PREFIX}./ | sed s/\$/.${WILDCARD_DNSv6_SUFFIX}/)

cat > /etc/nginx/sites-enabled/default <<EOF
geo \$ipv4 {
    0.0.0.0/0 ipv4;
}

geo \$ipv6 {
   ::0/0 ipv6;
}

server {
	listen 80 default_server;
	listen [::]:80 default_server;

	server_name _;

	location / {
EOF

if [ ! -z "${DOMAIN_V4}" ]; then
  cat >> /etc/nginx/sites-enabled/default <<EOF
      if (\$ipv4) {
        return 301 https://${DOMAIN_V4};
      }
EOF
fi

if [ ! -z "${DOMAIN_V6}" ]; then
  cat >> /etc/nginx/sites-enabled/default <<EOF
      if (\$ipv6) {
        return 301 https://${DOMAIN_V6};
      }
EOF
fi

cat >> /etc/nginx/sites-enabled/default <<EOF
    return 404;
	}
}

server {
	listen 80;
	listen [::]:80;

	server_name ${DOMAIN_V4} ${DOMAIN_V6};

	location / {
		proxy_pass http://localhost:8007;
	}
}
EOF

systemctl restart nginx

# Random email, change if necessary. Or ask the user to input one?
EMAIL="$(head /dev/urandom | tr -dc a-z0-9 | head -c 16)@$(head /dev/urandom | tr -dc a-z0-9 | head -c 16).com"


if [ ! -z "${DOMAIN_V4}" ]; then
  certbot --nginx -n -d "${DOMAIN_V4}" --agree-tos --email "${EMAIL}" --redirect
fi

if [ ! -z "${DOMAIN_V6}" ]; then
  certbot --nginx -n -d "${DOMAIN_V6}" --agree-tos --email "${EMAIL}" --redirect
fi