const OriginalConnScheduler = require('ssb-conn/lib/conn-scheduler').ConnScheduler;

module.exports = class ConnScheduler extends OriginalConnScheduler {
        updateHubNow() {
        var _a;
        const conn = this.ssb.conn;
        if (_a = this.config.seed, (_a !== null && _a !== void 0 ? _a : true)) {
            this.updateTheseConnections(p => p[1].source === 'seed', {
                quota: 3,
                backoffStep: 2e3,
                backoffMax: 10 * minute,
                groupMin: 1e3,
            });
        }
        if (conn.query().peersInConnection().length === 0) {
            this.updateTheseConnections(() => true, {
                quota: 1,
                backoffStep: 1e3,
                backoffMax: 6e3,
                groupMin: 0,
            });
        }
        this.updateTheseConnections(p => p[1].type === 'room', {
            quota: 5,
            backoffStep: 5e3,
            backoffMax: 5 * minute,
            groupMin: 5e3,
        });
        this.updateTheseConnections(p => notRoom(p) && hasPinged(p), {
            quota: 200,
            backoffStep: 10e3,
            backoffMax: 10 * minute,
            groupMin: 5e3,
        });
        this.updateTheseConnections(p => notRoom(p) && hasNoAttempts(p), {
            quota: 200,
            backoffStep: 30e3,
            backoffMax: 30 * minute,
            groupMin: 15e3,
        });
        this.updateTheseConnections(p => notRoom(p) && hasOnlyFailedAttempts(p), {
            quota: 3,
            backoffStep: 1 * minute,
            backoffMax: 3 * hour,
            groupMin: 5 * minute,
        });
        this.updateTheseConnections(p => notRoom(p) && isLegacy(p), {
            quota: 1,
            backoffStep: 4 * minute,
            backoffMax: 3 * hour,
            groupMin: 5 * minute,
        });
        conn
            .query()
            .peersConnectable('staging')
            .filter(this.weFollowThem)
            .z(take(3 - conn.query().peersInConnection().filter(this.weFollowThem).length))
            .forEach(([addr, data]) => conn.connect(addr, data));
        conn
            .query()
            .peersInConnection()
            .filter(this.weBlockThem)
            .forEach(([addr]) => conn.disconnect(addr));
        conn
            .query()
            .peersInConnection()
            .filter(p => conn.hub().getState(p[0]) === 'connecting')
            .filter(p => p[1].stateChange + this.maxWaitToConnect(p) < Date.now())
            .forEach(([addr]) => conn.disconnect(addr));
        conn
            .query()
            .peersConnected()
            .filter(p => p[1].type !== 'bt' && p[1].type !== 'lan')
            .filter(p => p[1].stateChange + 0.5 * hour < Date.now())
            .forEach(([addr]) => conn.disconnect(addr));
    }

}

