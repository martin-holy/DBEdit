<?php
  function GetJQGridData($tableName) {
    $page = GET('page', 1);
    $limit = GET('rows', 30);
    $sidx = GET('sidx', 1);
    $sord = GET('sord');

    $count = DbDoIt("select count(*) as count from $tableName", PDO::FETCH_NUM)[0][0];
    $total_pages = $count > 0 ? ceil($count / $limit) : 0;
    if ($page > $total_pages) $page = $total_pages;
    $start = $limit * $page - $limit;
    $result = DbDoIt("select * from $tableName order by $sidx $sord limit $start , $limit", PDO::FETCH_NUM);
    
    $response = new stdClass();    
    $responce->page = $page;
    $responce->total = $total_pages;
    $responce->records = $count;
    $i = 0;
    foreach ($result as $row) {
      $responce->rows[$i] = $row;
      $i++;
    }
      
    return json_encode($responce);
  }

  function CreateJQGrid($tableName) {
    $return = '<table id="table_'.$tableName.'"></table>';
    $return .= '<div id="pager_'.$tableName.'"></div>';
    $return .= '<script>';

    $columns = DbDoIt("select column_name, ifnull((select ifnull(".$GLOBALS['lang'].", Name) from LNG_Columns where LNG_Table_ID = "
      ."(select ID from LNG_Tables where Name = '$tableName') and Name = column_name), column_name) as DisplayName "
      ."from information_schema.columns where table_schema = '".$GLOBALS['DBName']."' and table_name = '$tableName' order by ordinal_position", 
    PDO::FETCH_NUM);
    
    $grid = new stdClass();
    $grid->url = "getJQGridData.php?tableName=$tableName";
    $grid->editurl = "phpstuff.php";
    $grid->datatype = 'json';
    $grid->colNames = array();
    $grid->colModel = array();
    foreach ($columns as $column) {
      $grid->colNames[] = $column[1];
      $grid->colModel[] = array("name" => $column[0], "editable" => true);
    }
    $grid->caption = DbDoIt("select ifnull(".$GLOBALS['lang'].", Name) from LNG_Tables where Name = '$tableName'")[0][0];
    $grid->autowidth = true;
    $grid->rowList = array(10, 20, 30);
    $grid->pager = "#pager_$tableName";
    $grid->viewrecords = true;
    $grid->sortname = $columns[0][0];
    $grid->height = 500;

    $return .= 'jQuery("#table_'.$tableName.'").jqGrid('.json_encode($grid).');';
    $return .= 'jQuery("#table_'.$tableName.'").jqGrid("navGrid","#pager_'.$tableName.'",{edit:true,add:true,del:true});';
    $return .= '</script>';
    return $return;
  }

  function CreateGrid($tableName) {
    $return = "<div class=\"grid\"><table>\n";
    
    //header
    $header = DbDoIt("select ifnull((select ifnull(".$GLOBALS['lang'].", Name) from LNG_Columns where LNG_Table_ID = "
      ."(select ID from LNG_Tables where Name = '$tableName') and Name = column_name), column_name) as DisplayName "
      ."from information_schema.columns where table_schema = '".$GLOBALS['DBName']."' and table_name = '$tableName' order by ordinal_position", 
      PDO::FETCH_NUM);
    $return .= "<tr>";
    foreach ($header as $col) {
      $return .= "<th>".$col[0]."</th>";
    }
    $return .= "</tr>\n";

    //data
    $data = DbDoIt("select * from $tableName", PDO::FETCH_NUM);
    foreach ($data as $row) {
      $return .= "<tr>";
      foreach ($row as $col) {
        $return .= "<td>".$col."</td>";
      }
      $return .= "</tr>\n";
    }

    $return .= "</table></div>\n";

    return $return;
  }
?>