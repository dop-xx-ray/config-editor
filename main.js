let id = 2; // start at 2 since we already have Config 1 in the HTML
// get form elements
let form;
let addressInput;
let hostInput;
let sniInput;
let portInput;
let tlsCheckbox;
let addConfigButton;
let configList;
let generateButton;

const init = () => {
    form = document.querySelector('form');
    addressInput = document.querySelector('#address');
    hostInput = document.querySelector('#host');
    sniInput = document.querySelector('#sni');
    portInput = document.querySelector('#port');
    tlsCheckbox = document.querySelector('#tls');
    addConfigButton = document.querySelector('#add-config-button');
    configList = document.querySelector('#config-list');
    generateButton = document.querySelector('#generate-button');
}
init();

addConfigButton.addEventListener('click', () => {
    const configInputGroup = document.createElement('div');
    configInputGroup.classList.add('config-input-group');
    configInputGroup.innerHTML = `<label for="config-${id}">Config list ${id}:</label>
                <textarea id="config-${id}" name="config-${id}"></textarea>`;
    configList.insertBefore(configInputGroup, addConfigButton);
    id++;
});

const data = generateButton.addEventListener('click', (event) => {
    event.preventDefault();

    const address = addressInput.value;
    const host = hostInput.value;
    const sni = sniInput.value;
    const port = portInput.value;
    const useTLS = tlsCheckbox.checked;

    // pull out config values
    const configInputs = configList.querySelectorAll('textarea');
    const configs = {};
    configInputs.forEach((input, index) => {
        const name = `config-${index + 1}`;
        configs[name] = input.value.split('\n').filter(item => item.trim() !== '');
    });

    let resultObject = loopConfigs(configs, address, host, sni, port, useTLS)
    showResult(resultObject);
});

const vmessGenerator = (configString, address, host, sni, port, useTLS) => {
    const tls = "tls";
    const base64String = configString.replace("vmess://", "");
    const decodedConfig = JSON.parse(atob(base64String));

    if (decodedConfig.net === "tcp") {
        decodedConfig.add = address;
        decodedConfig.host = host;
        if (useTLS) {
            decodedConfig.tls = tls;
            decodedConfig.sni = sni;
            decodedConfig.fp = "chrome";
        }
    } else if (decodedConfig.net === "ws") {
        decodedConfig.add = address;
        decodedConfig.host = host;
        decodedConfig.port = port;

        if (decodedConfig.path.includes("wss")) {
            decodedConfig.path = `${decodedConfig.path}?ed=2048/`;
        }
        if (useTLS) {
            decodedConfig.tls = tls;
            decodedConfig.sni = sni;
            decodedConfig.fp = "chrome";
            decodedConfig.alpn = "http/1.1";
        }
    } else if (decodedConfig.net === "grpc") {
        decodedConfig.add = address;
        decodedConfig.port = port;
        if (useTLS) {
            decodedConfig.tls = tls;
            decodedConfig.sni = sni;
            decodedConfig.fp = "chrome";
            decodedConfig.alpn = "h2";
        }
    }

    const jsonString = JSON.stringify(decodedConfig);
    return `vmess://${btoa(jsonString)}`;
}

const vlessGenerator = (configString, address, host, sni, port, useTLS) => {
    // Replace address and port
    configString = configString.replace(/@(.*?):(\d+)\?/g, `@${address}:${port}?`);
    // Check type of config and set type variable
    let type = "";
    if (configString.includes("type=ws")) {
        type = "ws";
    } else if (configString.includes("type=grpc")) {
        type = "grpc";
    }

    // Customize config for type=ws
    if (type === "ws") {
        if (useTLS) {
            configString = configString.replace(/security=none/g, `encryption=none&security=tls&sni=${sni}&alpn=http%2F1.1&fp=chrome&type=ws&host=${host}`);
        }
        if (configString.includes("wss")) {
            configString = configString.replace(/#/g, "%3Fed%3D2048%2F#");
        }
    }

    // Customize config for type=grpc
    if (type === "grpc") {
        if (useTLS) {
            configString = configString.replace(/security=none/g, `security=tls&sni=${sni}&alpn=h2&fp=chrome`);
        }
    }
    configString = configString.replace(/type=ws&/, "");
    return configString;
}

const trojanGenerator = (configString, address, host, sni, port, useTLS) => {
    // Replace address and port
    configString = configString.replace(/@(.*?):(\d+)\?/g, `@${address}:${port}?`);
    // Check type of config and set type variable
    let type = "";
    if (configString.includes("type=ws")) {
        type = "ws";
    } else if (configString.includes("type=grpc")) {
        type = "grpc";
    }

    // Customize config for type=ws
    if (type === "ws") {
        if (useTLS) {
            configString = configString.replace(/security=none/g, `encryption=none&security=tls&sni=${sni}&alpn=http%2F1.1&fp=chrome&type=ws&host=${host}`);
        }
        if (configString.includes("wss")) {
            configString = configString.replace(/#/g, "%3Fed%3D2048%2F#");
        }
    }

    // Customize config for type=grpc
    if (type === "grpc") {
        if (useTLS) {
            configString = configString.replace(/security=none/g, `security=tls&sni=${sni}&alpn=h2&fp=chrome&type=grpc`);
            configString = configString.replace(/#/g, "&mode=gun#");
        }
    }
    configString = configString.replace(/type=grpc&/, "");
    configString = configString.replace(/type=ws&/, "");
    return configString;
}

const generate = (configString, address, host, sni, port, useTLS) => {
    if (configString.startsWith("vmess://")) {
        return vmessGenerator(configString.slice(8), address, host, sni, port, useTLS);
    } else if (configString.startsWith("vless://")) {
        return vlessGenerator(configString, address, host, sni, port, useTLS);
    } else if (configString.startsWith("trojan://")) {
        return trojanGenerator(configString, address, host, sni, port, useTLS);
    } else {
        console.log(configString);
    }
}

const loopConfigs = (configObject, address, host, sni, port, useTLS) => {
    console.log(port);
    let newConfigObject = { ...configObject };
    for (const key in configObject) {
        const arr = configObject[key];
        for (let i = 0; i < arr.length; i++) {
            const configString = arr[i];
            const generated = generate(configString, address, host, sni, port, useTLS);
            newConfigObject[key][i] = generated;
        }
    }

    return newConfigObject;
}

const copy = () => {
    const inputs = document.querySelectorAll('#result-config-list textarea');
    inputs.forEach(input => {
        input.addEventListener('click', () => {
            navigator.clipboard.writeText(input.value).then(
                function () {
                    window.alert("Copying to clipboard was successful!");
                },
                function (err) {
                    window.alert("Could not copy text: ", err);
                });
        });
    });
}

const showResult = resultObject => {
    const resultDiv = document.getElementById("result-config-list");
    let i = 1;
    let html = "";

    for (const key in resultObject) {
        const value = resultObject[key];
        console.log(value);
        const text = value.join("\n");

        html += `<div class="config-result-group">
            <label for="${key}">result list ${i}:</label>
            <textarea id="${key}" name="${key}">${text}</textarea>
        </div>`;

        i++;
    }

    resultDiv.innerHTML = html;
    copy();
};
