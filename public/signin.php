<?php
require_once("user.php");

$loginFailed = false;
if(isset($_GET["logout"]))
{
  $user = new User();
  $user->logout();
}
else
{
  if(isset($_POST["username"]) && isset($_POST["password"]) && $_POST["username"] && $_POST["password"])
  {
    $user = new User();
    if($user->login($_POST["username"], $_POST["password"]))
    {
      header("Location: index.php");
    }
    else $loginFailed = true;
  }
}
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="author" content="Homegear UG">

    <title>Node-BLUE</title>

    <link href="vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet" media="screen">
    <style>
body {
  width: 100%;
  padding-top: 40px;
  padding-bottom: 40px;
  background-color: #eee;
}

input {
  width: 230px;
  border: none;
  font-weight: 300;
  font-size: 20px;
  padding: 11px 10px 9px;
  box-sizing: content-box;
  background: #fff;
  color: #555;
  cursor: text;
  outline: none;
  border-radius: 3px;
}

input.inputtop {
  border-bottom-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  margin-top: 5px;
  margin-bottom: 0 !important;
}

input.inputbottom {
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 5px;
}

.alert {
  margin-bottom: 5px;
}

button {
  padding: 10px 20px;
  width: 250px;
  font-size: 20px;
  border: 1px solid #3fa9f5;
  background-color: #3fa9f5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  border-radius: 3px;
}

p.footer {
  color: #1b1464;
  font-weight: 600;
  text-decoration: none;
  outline: none;
  text-align: center;
  margin-top: 40px
}
    </style>
  </head>

  <body>
    <div style="text-align: center; margin-bottom: 20px;"><img style="width: 200px; margin-left: auto; margin-right: auto;" src="red/images/node-blue.svg" /></div>
    <div style="position: relative; margin-left: auto; margin-right: auto; width: 250px;">
      <form role="form" action="<?PHP print $_SERVER["PHP_SELF"]; ?>" method="post">
        <input type="hidden" name="url" value="<?php if(isset($_GET['url'])) print $_GET['url']; ?>" />
        <input type="user" id="inputUser" name="username" class="inputtop" placeholder="Username" required autofocus />
        <input type="password" id="inputPassword" name="password" class="inputbottom" placeholder="Password" required />
        <?php if($loginFailed) print "<div class=\"alert alert-danger\" role=\"alert\">Wrong username or password.</div>"; ?>
        <button type="submit">Sign in</button>
      </form>
      <p class="footer">Node-BLUE</p>
    </div>
  </body>
</html>
