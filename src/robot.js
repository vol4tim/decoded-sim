import BN from "bn.js";
import { stringToHex } from "@polkadot/util";
import { keyring } from "./api";

export default class Robot {
  constructor(account, api) {
    this.api = api;
    keyring.setSS58Format(api.registry.chainSS58);
    this.account = keyring.addFromUri(account);
    this.address = this.account.address;
    this.state = false;
    this.driver = null;
    this.log = [];
    this._worker = null;
    this._timeout = null;
    this._loger = null;
    this._listener = null;
    this._getState();
  }

  destroy() {
    if (this._listener) {
      this._listener();
    }
    if (this._loger) {
      this._loger();
    }
    if (this._worker) {
      clearInterval(this._worker);
    }
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
  }

  async _getState() {
    try {
      const index = await this.api.query.datalog.datalogIndex(this.address);
      if (index.start.toNumber() > 0) {
        const count = index.start.toBn().div(new BN("1024")).toNumber();
        const data = await this.api.query.datalog.datalogItem([
          this.address,
          count - 1,
        ]);
        const state = JSON.parse(data[1].toHuman());
        if (state.state === "start") {
          this.state = true;
          this.driver = state.driver;

          this._timeout = setTimeout(() => {
            this.stop(this.driver);
          }, 60000);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  async listen() {
    console.log("listen");
    this._listener = await this.api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;
        if (event.section === "launch" && event.method === "NewLaunch") {
          const sender = event.data[0].toString();
          const robot = event.data[1].toString();
          const parameter = event.data[2].toHuman();
          if (this.address === robot) {
            if (parameter) {
              this.run(sender);
            } else {
              this.stop(sender);
            }
          }
        }
      });
    });
  }

  run(driver) {
    if (this.state) {
      throw new Error("currently busy");
    }
    console.log("start");
    this.state = true;
    this.driver = driver;
    this._saveLog(
      JSON.stringify({
        state: "start",
        driver,
      })
    );
    this.log = [
      {
        action: "start",
        driver,
      },
    ];
    this._worker = setInterval(() => {
      this.log.push({
        action: "data",
        data: Date.now(),
      });
    }, 3000);

    this._timeout = setTimeout(() => {
      this.stop(driver);
    }, 60000);
  }

  stop(driver) {
    console.log("stop", driver);
    if (!this.state) {
      throw new Error("robot is off");
    } else if (this.driver !== driver) {
      throw new Error("permission denied");
    }
    this.state = false;
    this.driver = null;
    clearInterval(this._worker);
    clearTimeout(this._timeout);
    this.log.push({
      action: "stop",
    });
    this._saveLog(
      JSON.stringify({
        state: "log",
        log: this.log,
      })
    );
  }

  async _saveLog(data, cb = null) {
    const tx = this.api.tx.datalog.record(stringToHex(data));
    await tx.signAndSend(this.account, (result) => {
      if (result.status.isFinalized && cb) {
        cb();
      }
    });
  }
}
