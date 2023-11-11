var background = (function () {
  let tmp = {};
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (request) {
      for (let id in tmp) {
        if (tmp[id] && (typeof tmp[id] === "function")) {
          if (request.path === "background-to-popup") {
            if (request.method === id) {
              tmp[id](request.data);
            }
          }
        }
      }
    });
    /*  */
    return {
      "receive": function (id, callback) {
        tmp[id] = callback;
      },
      "send": function (id, data) {
        chrome.runtime.sendMessage({
          "method": id, 
          "data": data,
          "path": "popup-to-background"
        }, function () {
          return chrome.runtime.lastError;
        });
      }
    }
  } else {
    return {
      "send": function () {},
      "receive": function () {}
    }
  }
})();

var config  = {
  "symbol": {},
  "path": {
    "map": "resources/map.json",
    "name": "resources/name.json"
  },
  "load": function () {
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  },
  "copy": function (e) { 
    e.preventDefault();
    /*  */
    const tmp = document.getElementById("symbol-icon").value;
    if (tmp) {
      e.clipboardData.setData("text/plain", tmp);
    }
  },
  "http": {
    "request": function (url, callback) {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {callback(xhr.response)};
      xhr.open("GET", url, true);
      xhr.responseType = "json";
      xhr.send();
    }
  },
  "add": {
    "option": {
      "to": {
        "select": function (txt, val, select) {
          const option = document.createElement("option");
          option.setAttribute("value", val);
          option.textContent = txt;
          select.appendChild(option);
        }
      }
    }
  },
  "convert": {
    "dec": {
      "to": {
        "dec": function (e) {return e},
        "symbol": function (e) {
          return e.replace(/&#(\d+);/g, function (m, n) {
            return String.fromCodePoint(n);
          });
        },
        "hex": function (e) {
          return e.replace(/&#(\d+);/g, function (m, n) {
            return "&#x0" + ("0000" + parseInt(n).toString(16).toUpperCase()).slice(-4);
          });
        },
        "unicode": function (e) {
          return e.replace(/&#(\d+);/g, function (m, n) {
            return "U+0" + ("0000" + parseInt(n).toString(16).toUpperCase()).slice(-4);
          });
        }
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      const context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?popup") {
              config.port.name = "popup";
            }
            /*  */
            chrome.runtime.connect({
              "name": config.port.name
            });
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          let tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "extra": function () {
    let count = 0;
    const extra = document.getElementById("extra");
    const select = document.getElementById("symbol-select");
    const resources = chrome.runtime.getURL("/data/interface/resources/");
    /*  */
    let loop = function (count) {
      const key = "range " + count * 1000 + '-' +  (count + 1) * 1000;
      const add = select.querySelector('[value="' + key + '"]') === null;
      if (add) {
        config.symbol.base[key] = [];
        config.add.option.to.select(key, key, select);
        config.http.request(resources + (count + ".json"), function (e) {
          for (let i = 0; i < e.length; i++) {
            config.symbol.list.push(e[i].code);
            config.symbol.base[key].push(e[i].code);
          }
          /*  */
          if (count < 64) {
            loop(++count);
          } else {
            extra.removeAttribute("state");
          }
        });
      } else {
        if (count < 64) {
          loop(++count);
        } else {
          extra.removeAttribute("state");
        }
      }
    };
    /*  */
    extra.setAttribute("state", "loading");
    window.setTimeout(function () {loop(count)}, 1000);
  },
  "app": {
    "fill": function (keyword) {
      let arr = [];
      let tmp = [];
      /*  */
      keyword = keyword ? keyword.toLowerCase() : '';
      config.storage.write("symbol.keyword", keyword.indexOf("range") !== -1 ? '' : keyword);
      /*  */
      const find = document.getElementById("find");
      const table = document.getElementById("symbol");
      const select = document.getElementById("symbol-select");
      /*  */
      if (keyword && keyword !== "all symbols") {
        if (config.symbol.base[keyword]) {
          select.value = keyword;
          arr = config.symbol.base[keyword];
        } else {
          for (let key in config.symbol.name) {
            let name = config.symbol.name[key].toLowerCase();
            if (name.indexOf(keyword) !== -1) {
              tmp.push(key);
            }
          }
          /*  */
          arr = tmp;
          select.selectedIndex = 1;
        }
      } else {
        arr = config.symbol.list;
        select.selectedIndex = 1;
      }
      /*  */
      table.textContent = '';
      find.textContent = "Loading...";
      /*  */
      window.setTimeout(function () {
        if (arr.length) {
          let count = 0;
          while (count < arr.length) {
            const tr = document.createElement("tr");
            for (let i = 0; i < 10; i++) {
              if (count < arr.length) {
                const td = document.createElement("td");
                /*  */
                td.setAttribute("code", arr[count]);
                td.setAttribute("dec", arr[count].split(',').map(e => config.convert.dec.to.dec(e)).join(''));
                td.setAttribute("hex", arr[count].split(',').map(e => config.convert.dec.to.hex(e)).join(''));
                td.setAttribute("symbol", arr[count].split(',').map(e => config.convert.dec.to.symbol(e)).join(''));
                td.setAttribute("unicode", arr[count].split(',').map(e => config.convert.dec.to.unicode(e)).join(''));
                td.setAttribute("name", config.symbol.name[arr[count]] ? config.symbol.name[arr[count]].toLowerCase() : "N/A");
                /*  */
                td.textContent = td.getAttribute("symbol");
                /*  */
                td.addEventListener("click", async function (e) {
                  const dec = e.target.getAttribute("dec");
                  const code = e.target.getAttribute("code");
                  const name = e.target.getAttribute("name");
                  const unicode = e.target.getAttribute("unicode");
                  /*  */
                  const icon = document.getElementById("symbol-icon");
                  const detail = document.getElementById("symbol-detail");
                  const search = document.getElementById("symbol-search");
                  /*  */
                  icon.value = e.target.textContent;
                  if (e.isTrusted) search.value = name;
                  detail.title = "The symbol is copied to the clipboard!";
                  detail.value = " Dec: " + dec + " Unicode: " + unicode + " Name: " + name;
                  /*  */
                  config.storage.write("symbol.code", code);
                  const result = await navigator.permissions.query({"name": "clipboard-write"});
                  if (e.isTrusted && result.state === "granted") {
                    navigator.clipboard.writeText(code);
                  }
                });
                /*  */
                tr.appendChild(td);
                count++;
              }
            }
            /*  */
            table.appendChild(tr);
          }
          /*  */
          window.setTimeout(function () {
            const symbol = document.getElementById("symbol");
            const selector = "td[code='" + config.symbol.selected + "']";
            /*  */
            const target = document.querySelector(selector);
            if (target) {
              target.click();
            } else {
              symbol.querySelector("td").click();
            }
          }, 300);
        }
        /*  */
        find.textContent = "Find";
      }, 300);
    },
    "start": function () {
      const map = chrome.runtime.getURL("/data/interface/" + config.path.map);
      const name = chrome.runtime.getURL("/data/interface/" + config.path.name);
      /*  */
      config.http.request(map, function (e) {
        if (e) {
          config.symbol.json = e;
          config.http.request(name, function (e) {
            if (e) {
              config.symbol.base = {};
              config.symbol.name = {};
              config.symbol.list = [];
              /*  */
              for (let i = 0; i < e.length; i++) {
                config.symbol.name[e[i].dec] = e[i].name;
              }
              /*  */
              for (let id in config.symbol.json) {
                const tmp = config.symbol.json[id];
                /*  */
                id = id.toLowerCase();
                config.symbol.base[id] = [];
                for (let i = 0; i < tmp.length; i++) {
                  config.symbol.list.push(tmp[i].code);
                  config.symbol.base[id].push(tmp[i].code);
                }
              }
              /*  */
              const all = document.getElementById("all");
              const find = document.getElementById("find");
              const extra = document.getElementById("extra");
              const select = document.createElement("select");
              const toggle = document.getElementById("toggle");
              const support = document.getElementById("support");
              const category = document.getElementById("category");
              const donation = document.getElementById("donation");
              const buttons = [...category.querySelectorAll("td")];
              const container = document.querySelector(".container");
              const search = document.getElementById("symbol-search");
              const state = config.storage.read("symbol.toggle") !== undefined ? config.storage.read("symbol.toggle") : "hide";
              /*  */
              toggle.setAttribute("state", state);
              category.setAttribute("state", state);
              container.setAttribute("state", state);
              select.setAttribute("id", "symbol-select");
              toggle.setAttribute("title", state === "hide" ? "Show icon categories" : "Hide icon categories");
              /*  */
              config.add.option.to.select("Select", '', select);
              config.add.option.to.select("All", "all symbols", select);
              for (let id in config.symbol.base) config.add.option.to.select(id, id, select);
              all.appendChild(select);
              /*  */
              for (let i = 0; i < buttons.length; i++) {
                buttons[i].addEventListener("click", function (e) {
                  config.app.fill(e.target.getAttribute("id"));
                });
              }
              /*  */
              select.addEventListener("change", function (e) {
                search.value = e.target.value;
                config.app.fill(search.value);
              });
              /*  */
              search.addEventListener("keypress", function (e) {
                if (e.code === 13) {
                  config.app.fill(e.target.value);
                }
              });
              /*  */
              toggle.addEventListener("click", function () {
                const state = toggle.getAttribute("state") === "hide" ? "show" : "hide";
                /*  */
                toggle.setAttribute("state", state);
                category.setAttribute("state", state);
                container.setAttribute("state", state);
                config.storage.write("symbol.toggle", state);
                toggle.setAttribute("title", state === "hide" ? "Show icon categories" : "Hide icon categories");
              });
              /*  */
              extra.addEventListener("click", function () {config.extra()});
              reload.addEventListener("click", function () {document.location.reload()});
              find.addEventListener("click", function () {config.app.fill(search.value)});
              support.addEventListener("click", function () {background.send("support")});
              donation.addEventListener("click", function () {background.send("donation")});
              search.addEventListener("input", function (e) {config.app.fill(e.target.value)});
              /*  */
              if (navigator.userAgent.indexOf("Edg") !== -1) document.getElementById("explore").style.display = "none";
              search.value = config.storage.read("symbol.keyword") !== undefined ? config.storage.read("symbol.keyword") : "arrow";
              config.symbol.selected = config.storage.read("symbol.code") !== undefined ? config.storage.read("symbol.code") : "&#8594;";
              /*  */
              config.app.fill(search.value);
            }
          });
        }
      });
    }
  }
};

config.port.connect();
document.addEventListener("copy", config.copy);
window.addEventListener("load", config.load, false);
