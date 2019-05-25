#!/bin/bash

cd ~

#
# install docker
#
sudo apt update
sudo apt install -y curl dnsutils apt-transport-https ca-certificates software-properties-common
wget https://download.docker.com/linux/debian/gpg -O docker-gpg
sudo apt-key add docker-gpg
echo "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee -a /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce
sudo systemctl start docker
sudo systemctl enable docker

#
# install ssb-room image
#
docker pull staltz/ssb-room

#
# create room container
#
mkdir ~/ssb-room-data
chown -R 1000:1000 ~/ssb-room-data

#
# Redirect internal 8007 to external 80
#
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8007

# create ./create-room script
cat > ./create-room <<EOF
#!/bin/bash
memory_limit=$(($(free -b --si | awk '/Mem\:/ { print $2 }') - 200*(10**6)))
docker run -d --name room \
   -v ~/ssb-room-data/:/home/node/.ssb/ \
   --network host \
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