if (!String.prototype.format) {
  String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match;
    });
  };
}

function GetUrlParameter(name, result = null) {
  var url = new URL(window.location.href);
  return url.searchParams.has(name) ? url.searchParams.get(name) : result;
}

var DBEdit = DBEdit || {};
DBEdit.GridData = null;

//Generate Grid
DBEdit.CreateGrid = function () {
  var tableName = GetUrlParameter('tableName');
  if (tableName == null) return;
  var page = GetUrlParameter('page', 1);
  var limit = GetUrlParameter('limit', 10);
  var sidx = GetUrlParameter('sidx', 1);
  var sord = GetUrlParameter('sord', '');
  
  DBEdit.GridParams = {'tableName': tableName, 'page': page, 'limit': limit, 'sidx': sidx, 'sord': sord, 'totalPages': 0};
  DBEdit.GridTableName = tableName;
  var http = new XMLHttpRequest();
  http.open('POST', 'dbedit.php?act=grid&tableName={0}&page={1}&limit={2}&sidx={3}&sord={4}'.format(tableName, page, limit, sidx, sord), true);
  http.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
  http.send(JSON.stringify({tableName: tableName}));
  http.onload = function() {
    DBEdit.GridData = JSON.parse(http.responseText);
    DBEdit.GridParams.totalPages = DBEdit.GridData.TotalPages;
    var grid = '<table class="grid"><thead><tr>';

    //header
    var header = DBEdit.GridData.Header;
    for (var i = 0; i < header.length; i++) {
      grid += '<th>{0}</th>'.format(header[i].DisplayName);
    }
    grid += '</tr></thead><tbody>';

    //data
    var rows = DBEdit.GridData.Data;
    for (var i = 0; i < rows.length; i++) {
      grid += '<tr onClick="DBEdit.EditRecord({0});">'.format(i);
      for (var j = 0; j < rows[i].length; j++) {
        var val = rows[i][j];
        if (val == null) {
          val = '';
        } else {
          if (header[j].ReplaceWith != null) {
            val = DBEdit.GridData.LookUps[j][val];
          }
          if (header[j].EditAs == 'checkbox') {
            val = val == '0' ? '' : '&#9745';
          }
        }

        grid += '<td>{0}</td>'.format(val);
      }
      grid += '</tr>';
    }

    document.getElementById('grid').innerHTML = grid;
    DBEdit.CreateGridPager();
    DBEdit.CreateEdit();
  }
}

//Create Grid Pager
DBEdit.CreateGridPager = function () {
  var p = DBEdit.GridParams;
  var tmp = '<a href="?act=grid&tableName={0}&limit={1}&sidx={2}&sord={3}&page={4}">{5}</a>'.format(p.tableName, p.limit, p.sidx, p.sord, '{0}', '{1}');
  var pager = tmp.format(1, '|<') + tmp.format(p.page > 1 ? p.page - 1 : 1, '<<') 
    + tmp.format(p.page < p.totalPages ? p.page + 1 : p.totalPages, '>>') + tmp.format(p.totalPages, '>|');
  document.getElementById("grid_pager").innerHTML = pager;
}

//Generate Edit form
DBEdit.CreateEdit = function () {
  var header = DBEdit.GridData.Header;
  var editForm = document.createElement('form');
  var editTable = document.createElement('table');
  var editDiv = document.getElementById('edit');

  editDiv.innerHTML = '';
  editDiv.appendChild(editForm);
  editForm.name = 'editForm';
  editForm.onSubmit = 'DBEdit.SaveRecord(); return false;';
  editForm.appendChild(editTable);

  for (var i = 0; i < header.length; i++) {
    var row = editTable.insertRow();
    row.insertCell().textContent = header[i].DisplayName;
    row.insertCell().appendChild(DBEdit.GetInput(i));
  }

  var buttons = document.createElement('div');
  editDiv.appendChild(buttons);
  buttons.setAttribute('class', 'flexF');
  buttons.innerHTML = '<button onClick="DBEdit.SaveRecord(); return false;">Save</button>'
                    + '<button onClick="DBEdit.CancelEdit(); return false;">Cancel</button>'
                    + '<button onClick="DBEdit.DeleteRecord(); return false;">Delete</button>';
}

//Generate corect input for editing
DBEdit.GetInput = function (colIdx) {
  var col = DBEdit.GridData.Header[colIdx];

  if (col.EditAs == 'datetime') col.EditAs = 'datetime-local';
  if (col.EditAs == 'varchar') col.EditAs = 'text';

  var elem = null;
  switch (col.EditAs) {
    case 'textarea': {
      elem = document.createElement('textarea');
      break;
    }
    case 'select': {
      elem = document.createElement('select');
      var lookUp = DBEdit.GridData.LookUps[colIdx];
      for (var id in lookUp) {
        elem.appendChild(new Option(lookUp[id], id));
      }
      break;
    }
    case 'number': {
      var numericScale = col.NumericScale == null ? 0 : parseInt(col.NumericScale);
      elem = document.createElement('input');
      elem.setAttribute('type', col.EditAs);
      elem.placeholder = numericScale == 0 ? '0' : '0.'+'0'.repeat(numericScale);
      elem.step = elem.placeholder.substring(0, elem.placeholder.length - 1) + '1';
      break;
    }
    default: {
      elem = document.createElement('input');
      elem.setAttribute('type', col.EditAs);
      break;
    }
  }

  elem.required = col.Required == true;
  elem.readOnly = col.ReadOnly == true;
  elem.id = '__' + col.Name;

  if (col.EditAs == 'checkbox') elem.required = false;

  return elem;
};

//Sets values to inputs and display edit form
DBEdit.EditRecord = function (idx) {
  DBEdit.EditedIdx = idx;
  var isNew = idx == -1 ? true : false;
  var header = DBEdit.GridData.Header;
  var form = document.forms.namedItem('editForm');

  for (var i = 0; i < form.elements.length; i++) {
    var val = isNew ? header[i].Default : DBEdit.GridData.Data[idx][i];
    var oField = form.elements[i];

    if (i == 0) { //0 is always auto incremen primary key
      oField.value = isNew ? -1 : val;
      oField.readOnly = true;
      continue;
    }

    switch (oField.type) {
      case 'checkbox': {
        oField.checked = val == 1;
        break;
      }
      case 'select-one': {
        if (val == undefined) {
          oField.selectedIndex = 0;
          break;
        }
        for (var j = 0; j < oField.options.length; j++) {
          if (oField.options[j].value == val) {
            oField.selectedIndex = j;
            break;
          }
        }
        break;
      }
      case 'text':
      case 'textarea': {
        oField.value = val == undefined ? '' : val;
        break;
      }
      default:
        oField.value = val;
        break;
    }
  }

  document.getElementById('edit').style.display = 'block';
};

//Cancel Edit
DBEdit.CancelEdit = function () {
  DBEdit.HideEdit();
};

//Hide Edit form
DBEdit.HideEdit = function () {
  document.getElementById('edit').style.display = 'none';
};

//Open Edit form
DBEdit.NewRecord = function () {
  DBEdit.EditRecord(-1);
};

//Save Record
DBEdit.SaveRecord = function () {
  var form = document.forms.namedItem('editForm');
  if (!form.checkValidity()) return;
  var oField, oFieldValue = "";
  var data = [];
  for (var i = 0; i < form.elements.length; i++) {
    oField = form.elements[i];
    switch (oField.type) {
      case 'checkbox':
        oFieldValue = oField.checked;
        break;
      case 'number':
        oFieldValue = oField.valueAsNumber;
        break;
      case 'select-one':
        oFieldValue = parseInt(oField.value);
        break;
      default:
        oFieldValue = oField.value;
        break;
    }
    if (!oField.required && oFieldValue == '') 
      oFieldValue = null;
    data[i] = [oField.id, oFieldValue];
  }

  var http = new XMLHttpRequest();
  http.open('POST', 'dbedit.php?act=saveRecord&tableName={0}'.format(DBEdit.GridTableName), true);
  http.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
  http.send(JSON.stringify(data));
  http.onload = function() {
    var response = JSON.parse(http.responseText);
    //TODO react on response
    DBEdit.HideEdit();
    DBEdit.CreateGrid(DBEdit.GridTableName);
  }
}