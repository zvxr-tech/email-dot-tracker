const EMAIL_LOCAL_MAX = 64;
const ENC_MARKER = '.';


var self = require('sdk/self');
var ss = require("sdk/simple-storage");
/* Created a skeleton of the persistant storage if one was not found. */
if (!ss.storage.nextNumber || ss.storage.nextNumber < 1) {
	ss.storage.nextNumber = 1;
	ss.storage.emailLocal = "";
	ss.storage.emailHost = ""
	ss.storage.radix = 0;
	ss.storage.mapping = [];
	ss.storage.reserved = [];
	console.log("Generating fresh storage...");
}

var buttons = require('sdk/ui/button/action').ActionButton({
  id: "mozilla-link",
	  label: "Email.Tracker",
	  icon: {
	    "16": "./icon-16.png",
	    "32": "./icon-32.png",
	    "64": "./icon-64.png"
	  },
	  onClick: function (state) {
		sidebar.show();
	  }
	});

	var sidebar = require("sdk/ui/sidebar").Sidebar({
	    id: 'my-sidebar',
	    title: 'Email.Tracker',
	    url: require("sdk/self").data.url("sidebar.html"),
	    onReady: onReady
	});


	function onReady(worker) {

		/* ATTACH MESSAGE HANDLERS FOR MESSAGES FROM SIDEBAR */
	
	worker.port.on("updateMaster", function(emailLocal, emailHost) {
		console.log('add-on script got an updateMaster request for "' + emailLocal + '@' + emailHost + '.');
		var radix = calculateRadix(emailLocal, EMAIL_LOCAL_MAX); /* Will return 0 on failure */
		var success = false;
		if (radix > 0) {
			ss.storage.emailLocal = emailLocal;
			ss.storage.emailHost = emailHost;
			ss.storage.reserved.push(emailLocal);
			ss.storage.radix = radix;
			menuItem.data = "true";
			success = true;
		}	
		worker.port.emit("updateMaster", emailLocal, emailHost, success);
	});
	
	worker.port.on("resetMaster", function() {
		console.log('add-on script got a resetMaster request.');
		var success = false;
		ss.storage.emailLocal = "";
		ss.storage.emailHost = "";
		ss.storage.nextNumber = 1;
		ss.storage.mapping = [];
		ss.storage.reserved = [];
		ss.storage.radix = 0;
		menuItem.data = null;
		success = true;
		/* gather simple storage and emit to the sidebar for population */
		var storage = JSON.stringify(ss.storage); 
		worker.port.emit("resetMaster", storage, true);
	});

	worker.port.on("mkReserved", function(emailLocal) {
		console.log('add-on script got add reserved messsage for email "' + emailLocal + '"');
		var emailLocalIndex = ss.storage.reserved.indexOf(emailLocal);
		if (emailLocalIndex < 0) {
		ss.storage.reserved.push(emailLocal);
		worker.port.emit("mkReserved", emailLocal, true); 
		return;
		}
		worker.port.emit("mkReserved", emailLocal, false);
	});

	worker.port.on("rmReserved", function(emailLocal) {
		console.log('add-on script got remove reserved messsage for email "' + emailLocal + '"');
		let emailLocalIndex = ss.storage.reserved.indexOf(emailLocal);
		/* Check to see if the email is in the reserved list */
		if (emailLocalIndex >= 0) {
		ss.storage.reserved.splice(emailLocalIndex, 1);
		worker.port.emit("rmReserved", emailLocal, true); 
		return;
		}
		worker.port.emit("rmReserved", emailLocal, false);
	});

	worker.port.on("queryEmail", function(email) {
		console.log('add-on script got the query message for email="' + email + '".');
		var response = [];
		for (map of ss.storage.mapping) {
		if (map.email == email) 
			response.push(map);
		}
		worker.port.emit("query", response, !!response.length);
	});

	worker.port.on("queryHost", function(host) {
		console.log('add-on script got the query message for host="' + host + '".');
		var response = [];
		for (map of ss.storage.mapping) {
		if (map.host.toLowerCase().indexOf(host.toLowerCase()) >= 0)
			response.push(map);
		}
		worker.port.emit("query", response, !!response.length);
	});
	
	/* gather simple storage and emit to the sidebar for population */
	var storage = JSON.stringify(ss.storage); 
	if (storage.radix > 0) 
		menuItem.data = "true";
	worker.port.emit("ready", storage, true);
}

var pageMod = require("sdk/page-mod").PageMod({
  include: "*",
  contentScriptFile: "./textbox-mod.js",
  attachTo: ["existing", "top", "frame"]
});


var contextMenu = require("sdk/context-menu");
var menuItem = contextMenu.Item({
  label: "Insert encoded email address",
  context: contextMenu.SelectorContext('input[type="text"]:enabled, input[type="email"]:enabled'),
  image: self.data.url("icon-16.png"),
  data: null,
  contentScriptFile: "./content-script.js",
  onMessage: handleEncodingRequest
});


function handleEncodingRequest(msg) {
	/* If this input element has not been previously populated with an
	 * encoded email address,Generate the next encoded email. 
	 * Keep incrementally generating until we get one that is not reserved.
 	 */
	if (!msg.prev) {
		var encEmailLocal = "";
		var isReserved = false;
		do {
			isReserved = false;
			encEmailLocal = encodeEmail(ss.storage.emailLocal, ss.storage.radix, ss.storage.nextNumber++);
			/*  bail out if encodeEmail fails (ie. we have maxed out) USING emailLocalMax */
			if (encEmailLocal.length > EMAIL_LOCAL_MAX) {
				var msgStr = "Error: Encoded email address length exceeded.";
				console.log(msgStr);
				alert(msgStr);
			}
				
			for (resEmail of ss.storage.reserved)
				isReserved |= (resEmail == encEmailLocal);
		} while (isReserved); 
		
		/* Push the encoded email out to a pageMod worker to populate the input box with it and
		* save the encoded email and associated hostname to the simplestorage backing 
		*/ 
		var encEmailAddress = combEmail(encEmailLocal, ss.storage.emailHost);
		ss.storage.mapping.push({host:msg.host, email:encEmailAddress, timestamp: Date.now()});	
		
		console.log("Mapped: (" + msg.host + "," + encEmailAddress + ")");
		
	} else {
		encEmailAddress	= msg.prev;
		
	}
	pageMod.port.emit("modTextbox", "input", msg.trackerAttr, encEmailAddress);
	
}



/*
 * Encode a number into a string.
 * Ex: input string  = "hello"
 *     radix         = 3
 *     number        = 38
 *     base3(number) = 000112
 *     output string = "hel.l.o.."
 *
 * We try and evenly distribute the radix across all of the digits, but because
 * we may have an odd sized number of remaining characters to work with, we 
 * could end up with extra available characters; we tack these onto the 
 * most-significant-digit (MSD). Eeven though technically, we are exceeding the
 * base for the MSD, it does not matter in the calculations since we are using 
 * dots to represent the value of each digit.
 * Ex. input string  = "hello"
 *     radix         = 2
 *     number        = 89
 *     base2(number) = 1011001
 *     output string = "..h.e.llo."
 */
function encodeEmail(input, radix, number) {
    var output = [];
    var cursor = input.length;
    while (cursor--) {
            let digitValue = number % radix;
            while (digitValue--) {
                    output.splice(0, 0, ENC_MARKER);
            }
            output.splice(0,0,input[cursor]);
            number = parseInt(number / radix);
    }
    while (number--) 
            output.splice(0, 0, ENC_MARKER);	
    return output.join("");
}


function decodeEmail(input, radix) {
    var cursor = input.length;
    var accum = 0, exp = 0, n = 0;
    while (cursor--) {
        if (input[cursor] == ENC_MARKER) {
            ++n;
        }
        accum += n * (radix^exp);
        n = 0;
        ++exp;
    }
    return accum;
}


/* If the email is at maxLen, or more, we hve no characters to encode digits
* with. Also, we cheat and only allow emails where we can at least encode 
* a "full" binary number such as: .h.e.l.l.o.
* This means we need at least (email.length + 1) remaining characters to 
* work with.
* The alternative would be complicated calculations to verify that our 
* encoding has not violated the maxLen or possibly introducing gaps in the 
* numbers encoded to mitigate this.
* 
* RETURN: 0 upon failure, radix for email encoding upon success.
*/
function calculateRadix(input, maxLen) {
	if (!input.length)
		return 0;

	var digitsAvailable = input.length + 1;
	var remainingChars  = maxLen - input.length;
	if (input.length > maxLen || remainingChars < digitsAvailable)
		return 0;
	var radix = parseInt(remainingChars / digitsAvailable);
	return radix;
}

function combEmail(local, host) {
	return local + "@" + host;
}
