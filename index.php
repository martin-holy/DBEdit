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
    <?php 
      include "dbedit.php";
      CreateDBStructure();

      //run just if db sturcure change
      //UpdateDBSettings();
    ?>

    <header>
      <?php echo CreateMainMenu(); ?>
    </header>
    <main class="main">
      <div id="grid"></div>
      <div id="edit" style="display: none;"></div>
    </main>
    <footer>
      <a href="#" onClick="DBEdit.NewRecord(); return false;">+</a>
    </footer>

    <script>
      DBEdit.CreateGrid('<?php echo GET('tableName', 'SYS_ColumnsSettings'); ?>');
    </script>

    <?php $conn = null; ?>
  </body>
</html>