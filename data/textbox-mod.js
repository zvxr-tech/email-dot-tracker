var emailExistsAttr = "enc-email-149162536496481100";
/* This is the code that manipulates the textbox that an encoded email address is entered into.
 * This is not handled by the contextmenu onlcick routine, because that function does not have 
 * access to all of the necessary info (E.g. reserved encoded email addresses) to generate the
 * next valid encoded email address. We also want to ensure that the same text inputboxes receive
 * the same encoded email address (except across page refreshes), while at the same time 
 * distinguishing between different text inputboxes on the same page, so that multiple input boxes 
 * can receive unique encoded email addresses.
 * So instead we have the following exectution flow:
 *
 * "user right clicks and selects 'Insert Encoded Email', over a text input box"
 * 	(i) contextmenu.onclick() is invoked with access to the DOM object of the textbox
 * 	    and tags the textbox object with a unique marker. It then emits a message back 
 *          to the main addon script.
 *	(ii) The main addon script receives the message and determines if that particular 
 *           input box has already been associated with an encoded email address.
 * 	(ii.b) If not, it generates the next valid encoded email address.
 * 	(ii.a) If it has, then it uses the previously generated encoded email address.
 * 	     In either case, it then emits whichever email address was determined to a mod-page
 * 	     worker-script.
 *      (iii) The mod-page worker script (this script) locates the tagged input box and places 
 *            the encoded email address it was provided via the main addon script as the value
 * 	      of the input box.
 * 
 * 
 */
self.port.on("modTextbox", function(tag, trackerAttr, encEmailAddress) {
	var elements = document.getElementsByTagName(tag);
	for (var i = 0; i < elements.length; i++) {
		if (elements[i].getAttribute(trackerAttr) == "true") {
			elements[i].setAttribute(trackerAttr, "false");
			if (elements[i].maxLength && elements[i].maxlength > 0 && elements[i].maxLength < encEmailAddress.length) {
				var errStr = "Error: Encoded email address length of " + encEmailAddress.length + " exceeds input element maxlength of " + elements[i].maxLength + ".";
				console.log(errStr);
				alert(errStr);
				return false;
			}
			elements[i].setAttribute(emailExistsAttr, encEmailAddress);
			elements[i].value = encEmailAddress;
			var errStr = "Success: Set encoded email address.";
			console.log(errStr);
			return true;
		}
	}
	var errStr = "Error: Could not locate encoded email address target input box.";
	console.log(errStr);
	return true;
});