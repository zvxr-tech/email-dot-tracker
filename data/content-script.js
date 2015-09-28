var trackerAttr = "spam-dot-trace-149162536496481100";
var emailExistsAttr = "enc-email-149162536496481100";
self.on("click", function (node, active) {
	if (active) {
		var hostname = window.location.hostname;
		prev = node.getAttribute(emailExistsAttr);
		node.setAttribute(trackerAttr, "true"); 
		self.postMessage({host:hostname, trackerAttr:trackerAttr, prev:prev});
		return true;
	} else {
		alert("You must update the master email (local/host) before an encoded email address can be generated!");
		return false;
	}
});
