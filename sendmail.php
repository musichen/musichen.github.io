<?php
 
if(isset($_POST['email'])) {

         //<!-- default vars:      name= first_name  last_name email telephone comments    -->
     // <!--  my EMAIL form vars:  name= yourname              email subject   comments  -->
 
    // EDIT THE 2 LINES BELOW AS REQUIRED
 
    $email_to = "alex.musichen@gmail.com";
 
    //   $email_subject = "Contacted from Musichen.url.ph";    if you want default subj
 
     
 
     
 
    function died($error) {
 
        // your error code can go here
 
        echo "We are very sorry, but there were error(s) found with the form you submitted. ";
 
        echo "These errors appear below.<br /><br />";
 
        echo $error."<br /><br />";
 
        echo "Please go back and fix these errors.<br /><br />";
 
        die();
 
    }
 
     
 
    // validation expected data exists
 
    if(!isset($_POST['yourname']) ||
 
        !isset($_POST['email']) ||
 
        !isset($_POST['subject']) ||
 
        !isset($_POST['comments'])) {
 
        died('We are sorry, but there appears to be a problem with the form you submitted.');       
 
    }
 
     
 
    $senders_name = $_POST['yourname']; // required
 
    $senders_email = $_POST['email']; // required
 
    $senders_subject = $_POST['subject']; // not required
 
    $senders_comments = $_POST['comments']; // required
 
     
 
    $error_message = "";
 
    $email_exp = '/^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/';
 
  if(!preg_match($email_exp,$senders_email)) {
 
    $error_message .= 'The Email Address you entered does not appear to be valid.<br />';
 
  }
 
    $string_exp = "/^[A-Za-z .'-]+$/";
 
  if(!preg_match($string_exp,$senders_name)) {
 
    $error_message .= 'The Name you entered does not appear to be valid.<br />';
 
  }
 
  if(strlen($senders_comments) < 2) {
 
    $error_message .= 'The Comments you entered do not appear to be valid.<br />';
 
  }
 
  if(strlen($error_message) > 0) {
 
    died($error_message);
 
  }
 
    $email_message = "Form details below.\n\n";
 
     
 
    function clean_string($string) {
 
      $bad = array("content-type","bcc:","to:","cc:","href");
 
      return str_replace($bad,"",$string);
 
    }
 
     
 
    $email_message .= "Name: ".clean_string($senders_name)."\n";
 
    $email_message .= "Email: ".clean_string($senders_email)."\n";
 
    $email_message .= "Subject: ".clean_string($senders_subject)."\n";
 
    $email_message .= "Comments: ".clean_string($senders_comments)."\n";
 
     
 
// create email headers
 
$headers = 'From: '.$senders_email."\r\n".
 
'Reply-To: '.$senders_email."\r\n" .
 
'X-Mailer: PHP/' . phpversion();
 
@mail($email_to, $senders_subject, $email_message, $headers);  
 
?>
 
 
 
<!-- include your own success html here -->
<!DOCTYPE html>
<html>
<head> <title> Message Sent! </title> <meta charset="utf-8"> </head>

<body>
<img src="img/face.jpg" width="194" height="204"/>
<br>
<img  src="img/langs/eng.png" height="40" width="40" style="float:left;"/>
<br>
<p> Thank you for contacting me! I'll reply as soon as possible! </p>
<br>
<img  src="img/langs/de.png" height="40" width="40" style="float:left;"/>
<br>
<p>Vielen Dank für Ihre Nachricht! 
<br>Ich werde Ihnen bald antworten! </p>
<br>
<img  src="img/langs/ru.png" height="40" width="40" style="float:left;"/>
<br>
Спасибо за Ваше сообщение! Я отвечу в ближайшее время!
</body>
 
<?php
 
}
 
?>
