<?php
  include "phpstuff.php";
  echo GetJQGridData(GET("tableName") ?: "LNG_Columns");
?>