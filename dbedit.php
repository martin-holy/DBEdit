<?php
  $conn = null;
  $lang = GET('lang', 'en');
  $DBName = 'classicmodels';

  if (GET('act') == 'grid') {
    $json = json_decode(file_get_contents("php://input"));
    echo json_encode(GetGridData($json->tableName, GET('page'), GET('limit'), GET('sidx'), GET('sord')));
  }

  function GET($key, $default = null) {
    return isset($_GET[$key]) ? $_GET[$key] : $default;
  }

  function DbDoIt($query, $fetchMode = PDO::FETCH_NUM) {
    $servername = "localhost";
    $username = "root";
    $password = "root";

    try {
      if ($GLOBALS['conn'] == null)
        $GLOBALS['conn'] = new PDO("mysql:host=$servername;dbname=".$GLOBALS['DBName'], $username, $password);
      $stmt = $GLOBALS['conn']->prepare($query); 
      $stmt->execute();
  
      return $stmt->fetchAll($fetchMode);
    }
    catch(PDOException $e) {
        echo "Error: " . $e->getMessage();
    }
  }

  function CreateMainMenu() {
    $query = "select table_name as 'DBName', "
      ."ifnull((select ifnull(".$GLOBALS['lang'].", Name) from SYS_TablesSettings where Name = table_name), table_name) as 'DisplayName' "
      ."from information_schema.tables where table_schema = '".$GLOBALS['DBName']."' and table_type = '%s' order by table_name";

    $return = "<nav class=\"dropdownmenu\"><ul>\n";

    $tablesAndViews = array(array("Tables", "BASE TABLE"), array("Views", "VIEW"));
    foreach ($tablesAndViews as $value) {
      $return .= '<li><a href="#">'.$value[0].'</a><ul id="submenu">'."\n";
      $data = DbDoIt(sprintf($query, $value[1]));
      foreach ($data as $row) {
        $return .= sprintf("<li><a href=\"?tableName=%s\">%s</a></li>\n", $row[0], $row[1]);
      }
      $return .= "</ul></li>\n";
    }

    $return .= "</ul></nav>\n";
    return $return;
  }

  function GetGridData($tableName, $page, $limit, $sidx, $sord) {
    $r = new stdClass();
    $r->Header = DbDoIt("select *, ifnull(".$GLOBALS['lang'].", Name) as DisplayName from SYS_ColumnsSettings "
      ."where SYS_TablesSettings_ID = (select ID from SYS_TablesSettings where Name='$tableName')", PDO::FETCH_ASSOC);

    //LookUps foreign keys
    $headerSize = count($r->Header);
    for ($i = 0; $i < $headerSize; $i++) {
      $col = $r->Header[$i];
      if ($col["ReplaceWith"] != null) {
        $lookUp = DbDoIt("select ".$col["ReferencedColumn"].", concat(".$col["ReplaceWith"].") from ".$col["ReferencedTable"], PDO::FETCH_NUM);
        $rep = [];
        foreach ($lookUp as $item) {
          $rep[$item[0]] = $item[1];
        }
        $r->LookUps[$i] = $rep;
      }
    }

    $count = DbDoIt("select count(*) as count from $tableName")[0][0];
    $total_pages = $count > 0 ? ceil($count / $limit) : 0;
    if ($page > $total_pages) $page = $total_pages;
    $start = $limit * $page - $limit;
    $r->Data = DbDoIt("select * from $tableName order by $sidx $sord limit $start , $limit");
    return $r;
  }

  function CreateDBStructure() {
    $inDb = DbDoIt("select count(*) from information_schema.tables where table_name='SYS_TablesSettings' or table_name='SYS_ColumnsSettings'")[0][0];

    DbDoIt("CREATE TABLE IF NOT EXISTS `SYS_TablesSettings` (
      `ID` INT(11) NOT NULL AUTO_INCREMENT,
      `Name` VARCHAR(64) NOT NULL,
      `En` VARCHAR(64) NULL DEFAULT NULL,
      `Pt` VARCHAR(64) NULL DEFAULT NULL,
      PRIMARY KEY (`ID`))
      COLLATE='utf8_general_ci'
      ENGINE=InnoDB
      AUTO_INCREMENT=1;");

    DbDoIt("CREATE TABLE IF NOT EXISTS `SYS_ColumnsSettings` (
      `ID` INT(11) NOT NULL AUTO_INCREMENT,
      `Name` VARCHAR(64) NOT NULL,
      `SYS_TablesSettings_ID` INT(11) NOT NULL,
      `En` VARCHAR(64) NULL DEFAULT NULL,
      `Pt` VARCHAR(64) NULL DEFAULT NULL,
      `Hidden` BIT(1) NOT NULL DEFAULT b'0',
      `ReadOnly` BIT(1) NOT NULL DEFAULT b'0',
      `Required` BIT(1) NOT NULL DEFAULT b'1',
      `Width` SMALLINT NULL DEFAULT NULL,
      `Align` VARCHAR(6) NOT NULL DEFAULT 'left',/*left, center, right*/
      `EditAs` VARCHAR(11) NOT NULL DEFAULT 'text',/*number, varchar, textarea, date, time, datetime, timestamp, select, multiselect, checkbox*/
      `ColumnDefault` VARCHAR(64) NULL DEFAULT NULL,
      `NumericScale` TINYINT NULL DEFAULT NULL,
      `ReplaceWith` VARCHAR(64) NULL DEFAULT NULL,/*Name, ' (', ID, ')' <= columns from foreign table*/
      `OrdinalPosition` SMALLINT NOT NULL DEFAULT 0,
      `ReferencedTable` VARCHAR(64) NULL DEFAULT NULL,
      `ReferencedColumn` VARCHAR(64) NULL DEFAULT NULL,
      PRIMARY KEY (`ID`),
      INDEX `SYS_TablesSettings_ID` (`SYS_TablesSettings_ID`),
      CONSTRAINT `SYS_TablesSettings_ibfk_1` FOREIGN KEY (`SYS_TablesSettings_ID`) REFERENCES `SYS_TablesSettings` (`ID`))
      COLLATE='utf8_general_ci'
      ENGINE=InnoDB
      AUTO_INCREMENT=1;");

    if ($inDb < 2) UpdateDBSettings();
  }

  function UpdateDBSettings() {
    $dbname = $GLOBALS['DBName'];
    //delete deleted tables
    DbDoIt("delete from SYS_TablesSettings where Name not in ("
      ."select table_name from information_schema.tables where table_schema = '$dbname' union "
      ."select table_name from information_schema.views where table_schema = '$dbname')");
    //insert new tables
    DbDoIt("insert into SYS_TablesSettings (Name) select table_name from ("
      ."select table_name from information_schema.tables where table_schema = '$dbname' union "
      ."select table_name from information_schema.views where table_schema = '$dbname') as tmp "
      ."where table_name not in (select Name from SYS_TablesSettings)");
    //delete deleted columns
    DbDoIt("delete from SYS_ColumnsSettings as C join SYS_TablesSettings as T on C.SYS_TablesSettings_ID = T.ID "
      ."where (T.Name, C.Name) not in (select table_name, column_name from information_schema.columns where table_schema = '$dbname')");
    //insert new columns
    DbDoIt("insert into SYS_ColumnsSettings (SYS_TablesSettings_ID, Name, OrdinalPosition, Required, EditAs, ColumnDefault, NumericScale) "
      ."select T.ID, C.column_name, C.ordinal_position, if (C.is_nullable = 'NO', true, false) as required, C.data_type, C.column_default, C.numeric_scale "
      ."from SYS_TablesSettings as T join information_schema.columns as C on C.table_schema = '$dbname' and T.Name = C.table_name "
      ."where (T.ID, C.column_name) not in (select SYS_TablesSettings_ID, Name from SYS_ColumnsSettings)");
    //change data types to edit types
    DbDoIt("update SYS_ColumnsSettings set EditAs = 'number' where EditAs in ('int', 'tinyint', 'smallint', 'mediumint', 'bigint', 'float', 'double', 'decimal')");
    DbDoIt("update SYS_ColumnsSettings set EditAs = 'checkbox' where EditAs in ('bit')");
    DbDoIt("update SYS_ColumnsSettings set EditAs = 'varchar' where EditAs in ('char')");
    DbDoIt("update SYS_ColumnsSettings set EditAs = 'textarea' where EditAs in ('tinytext', 'text', 'mediumtext', 'longtext')");
    //update ReplaceWith by primary key + first other column from foreign table
    DbDoIt("update SYS_ColumnsSettings as CS left join "
        ."(select T.ID, K.column_name, K.referenced_table_name, K.referenced_column_name, concat('''('',', k.referenced_column_name, ','') '',', "
          ."(select C.column_name from information_schema.columns as C "
          ."where C.column_key!='PRI' and C.table_schema='$dbname' and C.table_name=K.referenced_table_name order by C.ordinal_position limit 1)) as replace_with "
        ."from information_schema.key_column_usage as K join SYS_TablesSettings as T on K.table_name = T.Name "
        ."where K.table_schema='$dbname' and K.referenced_table_schema='$dbname') as R "
      ."on CS.SYS_TablesSettings_ID = R.ID and CS.Name = R.column_name "
      ."set CS.ReplaceWith = R.replace_with, CS.ReferencedTable = R.referenced_table_name, CS.ReferencedColumn = R.referenced_column_name");
  }
?>