`use strict`;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;

const CMD_VPNSTATUS = `nordvpn status`;
const CMD_COUNTRIES = `nordvpn countries`;
const CMD_SETTINGS = `nordvpn s`;
const CMD_CONNECT = "nordvpn c";
const CMD_DISCONNECT = "nordvpn d";

const stringStartsWithCapitalLetter = country => country && country.charCodeAt(0) >= 65 && country.charCodeAt(0) <= 90;
const getString = (data) => {
    if (data instanceof Uint8Array) {
        return imports.byteArray.toString(data);
    } else {
        return data.toString();
    }
}

var Vpn = class Vpn {
    constructor() {
        this.executeCommandSync = GLib.spawn_command_line_sync;
        this.executeCommandAsync = GLib.spawn_command_line_async;
        this.settings = ExtensionUtils.getSettings(`org.gnome.shell.extensions.gnordvpn-local`);
    }

    applySettings() {
        this.executeCommandAsync(`${CMD_SETTINGS} autoconnect ${this.settings.get_boolean(`autoconnect`)}`);
        this.executeCommandAsync(`${CMD_SETTINGS} cybersec ${this.settings.get_boolean(`cybersec`)}`);
        this.executeCommandAsync(`${CMD_SETTINGS} firewall ${this.settings.get_boolean(`firewall`)}`);
        this.executeCommandAsync(`${CMD_SETTINGS} killswitch ${this.settings.get_boolean(`killswitch`)}`);
        this.executeCommandAsync(`${CMD_SETTINGS} obfuscate ${this.settings.get_boolean(`obfuscate`)}`);
        this.executeCommandAsync(`${CMD_SETTINGS} ipv6 ${this.settings.get_boolean(`ipv6`)}`);
        this.executeCommandAsync(`${CMD_SETTINGS} protocol ${this.settings.get_string(`protocol`)}`);
        this.executeCommandAsync(`${CMD_SETTINGS} technology ${this.settings.get_string(`technology`)}`);
    }
    
    setToDefaults() {
        this.executeCommandAsync(`${CMD_SETTINGS} defaults`);
    }
    
    getStatus() {
        // Read the VPN status from the command line
        const [ok, standardOut, standardError, exitStatus] = this.executeCommandSync(CMD_VPNSTATUS);

        // Convert Uint8Array object to string and split up the different messages
        const allStatusMessages = getString(standardOut).split(`\n`);

        // Grab the message for an available update
        const updateMessage = allStatusMessages[0].includes('new version')
            ? allStatusMessages.shift(1)
            : null;

        // Determine the correct state from the "Status: xxxx" line
        // TODO: use results from vpn command to give details of error
        let connectStatus = (allStatusMessages[0].match(/Status: \w+/) || [''])[0]

        return {
            updateMessage,
            connectStatus,
            country: allStatusMessages.length > 2 && allStatusMessages[2].replace("Country: ", "").toUpperCase(),
            serverNumber: allStatusMessages.length > 1 && allStatusMessages[1].match(/\d+/),
        }
    }

    connectVpn(country) {
        if (country) {
            this.executeCommandAsync(`${CMD_CONNECT} ${country}`);
        } else {
            this.executeCommandAsync(CMD_CONNECT);
        }
    }

    disconnectVpn() {
        this.executeCommandAsync(CMD_DISCONNECT);
    }

    getCountries() {
        const [ok, standardOut, standardError, exitStatus] = this.executeCommandSync(CMD_COUNTRIES);

        const countries = getString(standardOut)
            .replace(/A new version.*?\./g, ``)
            .replace(/\s+/g, ` `)
            .split(` `)
            .sort();

        let processedCountries = [];
        for (let i = 3; i < countries.length; i++) {
            // All countries should be capitalized in output
            if (!stringStartsWithCapitalLetter(countries[i])) continue;
            if (countries[i].startsWith("A new version")) continue;

            processedCountries.push(countries[i].replace(",", ""));
        }

        return processedCountries;
    }
    
    getDisplayName(item) {
        return item?.replace(/_/g, " ");
    }
};