var fs = require("fs")

var current_ip
var options
var sendgrid
function init(){
	fs.access("config.txt", fs.R_OK, function(err){
		if(err){
			var config = {
				"store_ips": false,
				"contact_on_init": true,
				"update_time": 10000,
				"email_options": {
					"sendgrid_key": "Your sendgrid key",
					"recipient_email_address": [],
					"sender_email_address": "home@MyHouse.com",
					"email_subject": "Your server is at a new IP address.",
					"email_message": "<h3>Your new IP is [mynewipaddress]. Discovered at [timestamp].</h3><p>If you find any bugs, please email dakotacreason@gmail.com</p>",
					"console_email_message" : "You have been emailed. your new ip address is [mynewipaddress]. Discovered at [timestamp]."
				},
				"api_list": [
					"https://icanhazip.com",
					"http://bot.whatismyipaddress.com/",
					"http://checkip.dyndns.org/"
				]
			}
			fs.writeFileSync("config.txt", JSON.stringify(config, null, 4), "utf8")
			console.log("No congiguration file found. Generated config.txt.")
			console.log("You must edit config.txt with your Sendgrid key and email address at the very least!")
			return;
		} else {
			options = JSON.parse(fs.readFileSync("config.txt", "utf8"))
			if(options.email_options.sendgrid_key == "Your sendgrid key" || options.email_options.sendgrid_key == ""){
				console.log("Your sendgrid key is not set! Set it in config.txt")
				return;
			}
			if(options.email_options.recipient_email_address == [] || options.email_options.recipient_email_address == ["Your_email@example.com"] || options.email_options.recipient_email_address == [""]){
				console.log("Your email address isn't set! Edit the \"recipient_email_address\" ")
				return;
			}
			sendgrid  = require('sendgrid')(options.email_options.sendgrid_key)
			if(options.store_ips){
				fs.access("ip_store.txt", fs.W_OK, function(err){
					if(err){
						nextlogicalstep(true)
					} else {
						var file = JSON.parse(fs.readFileSync("ip_store.txt", "utf8"))
						current_ip = (file[file.length-1]).ip
						nextlogicalstep(false)
					}
				})
			} else {
				nextlogicalstep(true)
			}
		}
	})
	function nextlogicalstep(init){
		if(init){
			actuallygetip(function(ip){
				current_ip = ip
				if(options.contact_on_init){
					email(current_ip)
				}
				if(options.store_ips){
					var data = [
							{
								"ip": current_ip,
								"discovered": new Date().toLocaleString()
							}
						]
					var newfile = fs.writeFileSync("ip_store.txt", JSON.stringify(data, null, 4), "utf8")
				}
				setTimeout(function(){
					nextlogicalstep(false)
				}, options.update_time)
			}, 0)
		} else {
			actuallygetip(function(ip){
				if(ip !== current_ip){
					current_ip = ip
					email(current_ip)
					if(options.store_ips){
						var file = JSON.parse(fs.readFileSync("ip_store.txt", "utf8"))
						file.push({
							"ip": current_ip,
							"discovered": new Date().toLocaleString()
						})
						fs.writeFileSync("ip_store.txt", JSON.stringify(file, null, 4), "utf8")
					}
				}
				setTimeout(function(){
					nextlogicalstep(false)
				}, options.update_time)
			}, 0)
		}
	}
	function actuallygetip(__callback, i){
		gethttp(options.api_list[i], function(resp){
			if(/\d+.\d+.\d+.\d/.test(resp)){
				__callback(/\d+.\d+.\d+.\d/.exec(resp)[0])
			} else {
				actuallygetip(__callback, i+1)
			}
		})
	}
	function email(newip){
		if(typeof options.email_options.recipient_email_address == "array"){
			for(var i = 0; i< options.email_options.recipient_email_address.length; i++){
				if(options.email_options.recipient_email_address[i] != "" && options.email_options.recipient_email_address[i] != "Your_email@example.com"){
					sendgrid.send({
							to:       options.email_options.recipient_email_address[i],
							from:     options.email_options.sender_email_address,
							subject:  options.email_options.email_subject,
							html:     options.email_options.email_message.replace(/\[mynewipaddress\]/g, newip).replace(/\[timestamp\]/g, new Date().toLocaleString())
						}, function(err, json) {
							if (err) { return console.error(err); }
							console.log(options.email_options.console_email_message.replace(/\[mynewipaddress\]/g, newip).replace(/\[timestamp\]/g, new Date().toLocaleString()))
					})
				} else {
					console.log("You have an invalid email set! Edit \"recipient_email_address\" in config.txt")
					return;
				}
			}
		} else {
			if(options.email_options.recipient_email_address != "" && options.email_options.recipient_email_address != "Your_email@example.com"){
				sendgrid.send({
						to:       options.email_options.recipient_email_address,
						from:     options.email_options.sender_email_address,
						subject:  options.email_options.email_subject,
						html:     options.email_options.email_message.replace(/\[mynewipaddress\]/g, newip).replace(/\[timestamp\]/g, new Date().toLocaleString())
					}, function(err, json) {
						if (err) { return console.error(err); }
						console.log(options.email_options.console_email_message.replace(/\[mynewipaddress\]/g, newip).replace(/\[timestamp\]/g, new Date().toLocaleString()))
				})
			} else {
				console.log("You have an invalid email set! Edit \"recipient_email_address\" in config.txt")
				return;
			}
		}
	}
	function gethttp(url, callback){
		if(url.indexOf("https://") !== -1){
			var http = require("https")
		} else if(url.indexOf("http://") !== -1){
			var http = require("http")
		} else {
			throw "url must be http or https!"
		}
		http.get(url, function(res){
			var body = ""
			res.on("data", function(chunk){
				body+= chunk
			})
			res.on("end", function(){
				callback(body)
			})
		})
	}
}
init()