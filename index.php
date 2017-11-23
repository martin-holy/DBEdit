<!DOCTYPE html>
<html lang="en">
  <head>
    <title></title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="css/style.css" rel="stylesheet">
    <link href="css/menu.css" rel="stylesheet">
    <script src="js/dbedit.js"></script>
  </head>
<body>
<?php include "dbedit.php" ?>

<?php
  CreateDBStructure();
?>

<?php 
  //run just if db sturcure change
  //UpdateDBSettings();
?>

<?php 
  echo CreateMainMenu();
  echo "<br /><br /><br />";

  //echo CreateJQGrid(GET('tableName', 'LNG_Columns'));

  //echo CreateGrid($_GET["tableName"] ?: "LNG_Columns");

  //GetTableData($_GET["tableName"] ?: "LNG_Columns");
?>

    <div id="grid"></div>
    <div id="pager"></div>
    <div id="edit" style="display: none;"></div>

    <script>
      DBEdit.CreateGrid('<?php echo GET('tableName', 'LNG_Columns'); ?>');
    </script>

    <?php $conn = null; ?>
  </body>
</html>