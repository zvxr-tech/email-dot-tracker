const ENC_MARKER = '.';

addon.port.on("ready", function(storageJSON, success) {
	console.log("sidebar script got the message" + storageJSON);

	var master_local_text = document.getElementById("master-local-text");
	var master_host_text = document.getElementById("master-host-text");
	var update_master_button = document.getElementById("update-master-button");
	var reset_master_button = document.getElementById("reset-master-button");


	var reserved_email_list = document.getElementById("reserved-email-list");
	var add_reserved_button = document.getElementById("add-reserved-button");
	var remove_reserved_button = document.getElementById("remove-reserved-button");
	var local_reserved_text = document.getElementById("local-reserved-text");
	var host_reserved_text = document.getElementById("host-reserved-text");

	var query_text = document.getElementById("query-text");
	var query_radio_email = document.getElementById("query-radio-email");
	var query_radio_host = document.getElementById("query-radio-host");
	var query_button = document.getElementById("query-button");
	var query_response_list = document.getElementById("query-response-list");


	if (!master_local_text || 
	    !master_host_text || 
	    !update_master_button || 
	    !reset_master_button || 
	    !reserved_email_list || 
	    !add_reserved_button || 
	    !remove_reserved_button ||
	    !local_reserved_text ||
	    !host_reserved_text ||
	    !query_text ||
	    !query_radio_email ||
	    !query_radio_host ||
	    !query_button ||
	    !query_response_list) {
		var msgStr = "Error: Could not locate all of the required sidebar elements"   
				+ "\nmaster_local_text: " + !!master_local_text  
				+ "\nmaster_host_text: " + !!master_host_text  
				+ "\nupdate_master_button: " + !!update_master_button  
				+ "\nreset_master_button: " + !!reset_master_button
				+ "\nreserved_email_list: " + !!reserved_email_list 
				+ "\nadd_reserved_button: " + !!add_reserved_button 
				+ "\nremove_reserved_button: " + !!remove_reserved_button 
				+ "\nlocal_reserved_text: " + !!local_reserved_text  
				+ "\nquery_text: " + !!query_text  
				+ "\nquery_radio_email: " + !!query_radio_email  
				+ "\nquery_radio_host: " + !!query_radio_host
				+ "\nquery_button: " + !!query_button
				+ "\nquery_response_list: " + !!query_response_list;
			console.log(msgStr);
			alert(msgStr);
			return;
	}
    
	/* ----------------------------
	 * POPULATE SIDEBAR ELEMENTS 
	 * ----------------------------*/
	
	updateSidebarFromStorage(storageJSON);
	/* ----------------------------
	 * ATTACH EVENT HANDLERS 
	 * ----------------------------*/
	 
	update_master_button.onclick = function() {
		if (!validateMasterEmailLocal(master_local_text.value)) {
			msgStr = 'Invalid email local-part: "' + master_local_text.value + '"\nIt must not be empty, nor contain the encoding marker "' + ENC_MARKER + '"';
			alert(msgStr);
		} else {
			toggleMasterButtons(false);
			msgStr = 'Updating master email address.';
			addon.port.emit("updateMaster", master_local_text.value, master_host_text.value);
		}
		console.log(msgStr);
	}
	
	reset_master_button.onclick = function() {
		var answer = prompt("This will reset the addon to it's original state. It will remove all existing website-email associations, remove all reserved email addresses, and reset the encoding counter. Type 'yes' into the box below to proceed.", "no");
		if (answer != null && answer.toUpperCase() == "YES") {
			msgStr = "Resetting addon confirmed!";
			addon.port.emit("resetMaster");
		} else {
			msgStr = "Resetting addon cancelled!";
		}
		console.log(msgStr);
	}
	
	/* Only enable the remove-from-reserved-list button when an
	* item is selected from the reserved listbox.
	*/
	reserved_email_list.onchange = function() {
		remove_reserved_button.disabled = (reserved_email_list.value && reserved_email_list.selectedIndex >= 0) ? false : true;
	}

	add_reserved_button.onclick = function() {
	/* Add an email to the reserved list.
	This checks to see if the email is already in the list, if so it returns failure.
	If not found, it emits a message to the addon script so that the email can be added to
	the persistant storage. The addon script also performs a duplicate check.
	The addon script will emit a reply back to this (sidebar) script reporting success or failure. Failure is generally due to a duplicate already existing in the 
	persistant storage. The response logic is handled by another function.
	*/
		toggleReservedButtons(false);
		var emailLocal = local_reserved_text.value;
		if (!emailLocal || emailLocal.length < 1) {
			var msgStr ="Candidate reserved email cannot be empty.";
			alert(msgStr);
			console.log(msgStr);
			toggleReservedButtons(true);
			return;
		}
		for (entry of reserved_email_list.options) {
			if (emailLocal == entry.value) {
				msgStr = '"' + emailLocal + '" already exists in the reserved email list.';
				alert(msgStr);
				console.log(msgStr);
				toggleReservedButtons(true);
				return;
			}
		}
		addon.port.emit("mkReserved", emailLocal);
	}
    
	remove_reserved_button.onclick = function() {
		toggleReservedButtons(false);
		if(!reserved_email_list.value) {
			toggleReservedButtons(true);
			return;
		}
		addon.port.emit("rmReserved", reserved_email_list.value);
	}

	/* Clear the previous query results and check the validity of the new query before sending
	* the query to the main add-on script for processing.
	*/
	query_button.onclick = function() {
		while (query_response_list.firstChild) {
			query_response_list.removeChild(query_response_list.firstChild);
		}
		var msgStr = ""; 
		var queryType = query_radio_email.checked ? "Email" : (query_radio_host.checked ? "Host" : null);
		if (query_text.value.length > 0 && queryType) {
			msgStr = 'Querying (' + query_text.value + ', ' + queryType + ').';
			addon.port.emit("query" + queryType, query_text.value, queryType);
		} else {
			msgStr = 'Invalid query: "' +  query_text.value + '"';
			alert(msgStr);
		}
		console.log(msgStr);
	}

});
     

/* ----------------------------
*    ATTACH MESSAGE LISTENERS
*  ----------------------------*/
addon.port.on("resetMaster", function(storageJSON, success) {
	if (success) {
		updateSidebarFromStorage(storageJSON);
		msgStr = 'Successfully reset the addon.';
	} else {
		/* Failure */
		msgStr = 'Error: Resetting the addon.';
	}
	console.log(msgStr);
	alert(msgStr);
});

addon.port.on("updateMaster", function(emailLocal, emailHost, success) {
	if (success) {
		var local_reserved_text = document.getElementById("local-reserved-text");
		var host_reserved_text = document.getElementById("host-reserved-text");
		if (local_reserved_text && host_reserved_text) {
			local_reserved_text.value = emailLocal;
			host_reserved_text.value = emailHost;
		}
		msgStr = 'Successfully changed master email address to: "' + emailLocal + '@' + emailHost + '"';
	} else {
		msgStr = 'Error: Setting master email address.';
	}
	toggleMasterButtons(true);
	alert(msgStr);
	console.log(msgStr);
});

addon.port.on("mkReserved", function(emailLocal, success) {
	if (success) {
		var reserved_list_node = getReservedListNode();
		if(reserved_list_node) {
			/* add the email to the listbox */
			var option = document.createElement("option");
			option.text = emailLocal;
			reserved_list_node.add(option);
		}
		/* Although we cannot update the sidebox listbox, the entry was actually
		* made to the persistant storage, so report success 
		*/
		msgStr = 'Successfully added "' + emailLocal + '" to the reserved email list.';
	} else {
		/* Failure */
		msgStr = 'Error: Adding reserved email "' + emailLocal + '" failed.';
		alert(msgStr);
	}
	toggleReservedButtons(true);
	console.log(msgStr);
});


addon.port.on("rmReserved", function(emailLocal, success) {
	if (success) {
		var reserved_list_node = getReservedListNode();
		if(!reserved_list_node) {
			toggleReservedButtons(true);
			return;
		}
		/* find the email in the listbox and remove DOM object */
		for (var i = 0; i < reserved_list_node.length; ++i) {
			if (reserved_list_node.options[i].value == emailLocal)
				reserved_list_node.remove(i);
		}
		msgStr = 'Successfully removed "' + emailLocal + '" from the reserved email list.';
	} else {
		/* Failure */
		msgStr = 'Error: Removing "' + emailLocal + '" failed.';
		alert(msgStr);
	}
	toggleReservedButtons(true);
	console.log(msgStr);
}); 


addon.port.on("query", function(response, success) {
	var query_response_list = document.getElementById("query-response-list");
	if (success) {
		for (res of response) {
			option = document.createElement("option");
			var date = new Date(res.timestamp);
			option.text = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
			query_response_list.add(option);
			
			option = document.createElement("option");
			option.text = res.host;
			query_response_list.add(option);
			
			option = document.createElement("option");
			option.text = res.email;
			query_response_list.add(option);
			
			option = document.createElement("option");
			option.text = '------------';
			query_response_list.add(option);
		}
		msgStr = 'Successfully queried.';
	} else {
	/* Failure */
		msgStr = 'Could not find a record.\n';
		//msgStr += (type == "Email" ? 'Did you use the full email address?\n(Ex. foobar@example.com)' : '');
		alert(msgStr);
	}
	console.log(msgStr);
}); 


/* ----------------------------
*   HELPER ROUTINES 
*  ----------------------------*/

function updateSidebarFromStorage(storageJSON) {
	/* POPULATE SIDEBAR ELEMENTS */
	var master_local_text = document.getElementById("master-local-text");
	var master_host_text = document.getElementById("master-host-text");
	var reserved_email_list = document.getElementById("reserved-email-list");
	var local_reserved_text = document.getElementById("local-reserved-text");
	var host_reserved_text = document.getElementById("host-reserved-text");
	
	var storage = JSON.parse(storageJSON);

	master_local_text.value = storage.emailLocal ? storage.emailLocal : "";
	master_host_text.value = storage.emailHost ? storage.emailHost : "";

	local_reserved_text.value = storage.emailLocal ? storage.emailLocal : "";
	host_reserved_text.value = storage.emailHost ? storage.emailHost : "";

	for (res of storage.reserved) {
		var option = document.createElement("option");
		option.text = res;
		reserved_email_list.add(option);
	}	
	
	return false;
}


/* 
 * Enable/Disable the add reserved and removed reserved email buttons.
 * state: true=enable, false=disable
 */
function toggleReservedButtons(state) {
	var add_reserved_button = document.getElementById("add-reserved-button");
	var remove_reserved_button = document.getElementById("remove-reserved-button");
	var reserved_email_list = document.getElementById("reserved-email-list");

	if(add_reserved_button)
		add_reserved_button.disabled = !state;

	if(remove_reserved_button && reserved_email_list) {
		/* only re-enable the remove button if an item is selected from the listbox */
		remove_reserved_button.disabled = (reserved_email_list.value && reserved_email_list.selectedIndex >= 0) ? !state : true;
	}
	return (remove_reserved_button && add_reserved_button && reserved_email_list);
}

/* 
 * Enable/Disable the master-email update buttons.
 * state: true=enable, false=disable
 */
function toggleMasterButtons(state) {
	var update_master_button = document.getElementById("update-master-button");
	if (update_master_button)
		update_master_button.disabled = !state;
	return (!!update_master_button)
}


/* Helper function to get the node element of the reserved list */
function getReservedListNode() {
	var optionListNode = document.getElementById("reserved-email-list");
	if (!optionListNode) {
		alert("Error: Could not locate the sidebox reserved email option listbox.");
		return null;
	}
	return optionListNode;
}

/* Validate the master email.
 * It should be:
*  - non-null
*  - not contain any dots 
*  - be of at least length 1
*/
function validateMasterEmailLocal(email) {
	if (email && email.length > 0 && email.indexOf(ENC_MARKER) < 0)
		return true; /* valid */
	return false; /* invalid */
}
