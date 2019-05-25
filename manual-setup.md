# Manual setup

### Install Docker

To run an SSB room you need to have a static public IP, ideally with a DNS record (i.e.`<hostname.yourdomain.tld>`).

On a fresh Debian 9 box, as root, run:

```shell
apt update
apt upgrade -y
apt install -y apt-transport-https ca-certificates curl software-properties-common
wget https://download.docker.com/linux/debian/gpg -O docker-gpg
sudo apt-key add docker-gpg
echo "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee -a /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce
systemctl start docker
systemctl enable docker
```

### Install the `ssb-room` image

#### (Option A) Pull the image from docker hub

```shell
docker pull staltz/ssb-room
```

#### (Option B) Build the image from source

From GitHub:

```shell
git clone https://github.com/staltz/ssb-room.git
cd ssb-room
docker build -t staltz/ssb-room .
```

### Create a container called `room`

#### Step 1. Create a directory on the Docker host for persisting the room's data

```shell
mkdir ~/ssb-room-data
chown -R 1000:1000 ~/ssb-room-data
```

(If migrating from an old server, copy the previous `ssb-room-data` and paste it in the new one)

#### Step 2. Configure the firewall to redirect the HTTP port

```shell
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8007
```

#### Step 3. Run the container

Create a `./create-room` script:

```shell
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
```

where `--memory` sets an upper memory limit of your total memory minus 200 MB (for example: on a 1 GB server this could be simplified to `--memory 800m`).

Then make the script executable and run it:

```shell
chmod +x ./create-room
./create-room
```

#### Step 4. Create the `./room` script

The shell script in `./room` will help us command our SSB Room server:

```shell
cat > ./room <<EOF
#!/bin/sh
docker exec -it room ssb-room \$@
EOF
```

Then make it executable and run it:

```shell
chmod +x ./room
./room check
```

### Setup an auto-healer container

SSB room has a built-in health check: `ssb-room check`.

When `room` becomes unhealthy, we want to kill the container, so it will be automatically restarted by Docker.

For this situation, we will use [ahdinosaur/healer](https://github.com/ahdinosaur/healer):

```shell
docker pull ahdinosaur/healer
```

```shell
docker run -d --name healer \
  -v /var/run/docker.sock:/tmp/docker.sock \
  --restart unless-stopped \
  ahdinosaur/healer
```

### Ensure containers are always running

Sometimes the `room` or `healer` containers will stop running (despite `--restart unless-stopped`!).

For this situation, we will setup two cron job scripts:

```shell
printf '#!/bin/sh\n\ndocker start room\n' | tee /etc/cron.hourly/room && chmod +x /etc/cron.hourly/room
printf '#!/bin/sh\n\ndocker start healer\n' | tee /etc/cron.hourly/healer && chmod +x /etc/cron.hourly/healer
```

Because `docker start <service>` is [idempotent](https://en.wikipedia.org/wiki/Idempotent), it will not change anything if the service is already running, but if the service is not running it will start it.
