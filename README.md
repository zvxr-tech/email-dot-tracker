# Email-dot-Tracker

## Overview
Email.Tracker uses the gmail-dot-hack to allow you to track how your email address is being used when you submit it to online services.

This uses dots in a gmail local-part email address to encode a number into the email address provided to a given website. This allows for us to track how the website uses that email address, since each website will be associated with a different email, encoded with a unique number.

## Motivation
UUsing a `+` symbol to tag your email address has been shown to be an effective means to track how an email address you submit to an online service is being used. However, not all websites allow for this symbol to be used, but most do allow for the `.` symbol to be used. We take advantage of this and use the `.` to encode a unique identitying number within an email address and associate that with the website being submitted to. If you start receiving spam from an encoded address, you can simply query the addon to determine which website was originally supplied the encoded email address in question.

*This is a POC, critique it as such.*

## Installation

### Running
```jpm -b $(which firefox) run```

### Compiling
From the source root:
```jpm xpi```

### Install to Firefox
Open .xpi file from the Firefox open-file dialog box.

### More Info
https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm

## Running
### First Time
1) Open the addon sidebar using either the icon in the top right corner of Firefox, or from the menu: View->Sidebar->Email.Tracker

2) Input a master email address. The local-part goes in the first textbox, and the domain-part in the second. 

For example, the email address `john@example.com` can be decomposed into the local-part: `john` and domain-part: `example.com`

3) Click update to set the email address.

4) When you visit a website you want to submit an encoded email address to, right click on the input box on the target website and select "Insert encoded email" from the context menue. This will permanently associate the encoded email address that is inserted with the FQDN of the website you are visiting.

### Reserving Email Addresses
Sometimes you may wish to reserve certain encodings of your email address from being used. For example, `johndoe@example.com` might frequently use `john.doe@example.com` and not wish this to ever be used by this addon. 

To reserve an email address, enter the local-part in the input box above the 'Add' button, and then click the 'Add' button. To remove an email address from the reservation list, select the email from the listbox and click the 'Remove' button.

### Querying the System
You can query the system by email address or by website hostname. The most common use case is that you receive a spam email and you wish to trace which website the email address was derived from. To do so, simply enter the email address in the input box below "Query", select "email" from the radio toggle, and click the query button. 

Similarly, to search which email addresses were used for a website, enter the website name in the query input box and select Host from the radio toggle, before clicking the query button. (This query will match on any FQDN which contains the query string).

### De-associating Email Addresses
Because there is (in theory) a large pool of encoded email addresses to use, this POC addon does not allow for entries to be removed.

### Resetting the Addon
To completely set the addon back to it's initial configuration (no master email address, no reserved email addresses, and to reset encoding counter), click the reset button at the bottom of the sidebar, and confirm the prompt that appears. 
**WARNING: This is irreversable!**

## Notes
- Each input element in a webpage will receive the same encoded email address until the page is 
refreshed.

- Different input elements (of the same page) will receive different encoded email
addresses (but still adhering to the above) until the page is refreshed.
The reason being is that there may be scenarios where you are required to enter
two separate email addresses (E.g. Primary and Backup), this approach allows for
multiple encoded email addresses per page.

- If the master email address is changed, we do not bother resetting the encoding counter because there is more than likely 
 millions of available encodings to draw from.