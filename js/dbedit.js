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

var DBEdit = DBEdit || {};
DBEdit.GridData = null;

DBEdit.CreateGrid = function (tableName, page = 1, limit = 200, sidx = 1, sord = '') {
  var http = new XMLHttpRequest();
  http.open('POST', 'dbedit.php?act=grid&tableName={0}&page={1}&limit={2}&sidx={3}&sord={4}'.format(tableName, page, limit, sidx, sord), true);
  http.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
  http.send(JSON.stringify({tableName: tableName}));
  http.onload = function() {
    DBEdit.GridData = JSON.parse(http.responseText);
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
      grid += '<tr onclick="DBEdit.EditRecord({0});">'.format(i);
      for (var j = 0; j < rows[i].length; j++) {
        var val = rows[i][j];
        if (header[j].ReplaceWith != null) {
          val = DBEdit.GridData.LookUps[j][val];
        }
        grid += '<td>{0}</td>'.format(val);
      }
      grid += '</tr>';
    }

    document.getElementById('grid').innerHTML = grid;
  }
}

//Generate Edit form and shows it
DBEdit.EditRecord = function (idx) {
  var isNew = idx == -1 ? true : false;
  var edit = '';
  edit += '<table>';

  var header = DBEdit.GridData.Header;
  for (var i = 0; i < header.length; i++) {
    var val = isNew ? (header[i].Default == null ? '' : header[i].Default) : DBEdit.GridData.Data[idx][i];
    edit += '<tr><td>{0}:</td><td>{1}</td></tr>'.format(header[i].DisplayName, DBEdit.GetInput(header[i], val));
  }

  edit += '</table>';

  edit += '<div data-role="controlgroup" data-type="horizontal" data-mini="true">';
  edit += '<a href="#" class="ui-shadow ui-btn ui-corner-all ui-btn-icon-left ui-icon-check ui-btn-b" onclick="DBEdit.SaveRecord({0}); return false;">Save</a>'.format(idx);
  edit += '<a href="#" class="ui-shadow ui-btn ui-corner-all ui-btn-icon-left ui-icon-delete ui-btn-b" onclick="DBEdit.CancelEdit(); return false;">Cancel</a>';
  edit += '<a href="#" class="ui-shadow ui-btn ui-corner-all ui-btn-icon-left ui-icon-delete ui-btn-b" onclick="DBEdit.DeleteRecord({0}); return false;" {1}>Delete</a>'.format(idx, idx == -1 ? 'disable' : '');
  edit += '</div>';

  var ed = document.getElementById('edit');
  ed.innerHTML = edit;
  ed.style.display = 'block';
};

//Generate corect input for editing
DBEdit.GetInput = function (col, val) {
  var required = col.Required == '1' ? 'required' : '';
  var readonly = col.ReadOnly == '1' ? 'readonly' : '';

  switch (col.EditAs) {
    case 'Integer':
      return '<input type="number" id="__{0}" value="{1}" {2} {3}>'.format(col.name, val, readonly, required);
    case 'Numeric':
      return '<input type="text" id="__{0}" value="{1}" {2} {3} pattern="^[0-9]+(\.[0-9]+)?$">'.format(col.name, val, readonly, required);
    case 'Date':
      return '<input type="date" id="__{0}" value="{1}" {2} {3}>'.format(col.name, val, readonly, required);
    case 'varchar':
      return '<input type="text" id="__{0}" value="{1}" {2} {3}>'.format(col.name, val, readonly, required);
    case 'Textarea':
      return '<textarea id="__{0}" {1} {2}>{3}</textarea>'.format(col.name, readonly, required, val);
    case 'Select':
      {
        var out = '';
        out += '<select id="__{0}" {1} {2}>'.format(col.name, readonly, required);

        for (var i = 0; i < col.dataSource.length; i++) {
          out += '<option value="{0}" {1}>{2}</option>'.format(
            col.dataSource[i].value,
            col.dataSource[i].value == val ? 'selected' : '',
            col.dataSource[i].text);
        }

        out += '</select>';
        return out;
      }
    case 'MultiSelect':
      {
        var out = '';
        out += '<select multiple="multiple" data-native-menu="false" id="__{0}" {1} {2}>'.format(col.name, readonly, required);

        for (var i = 0; i < col.dataSource.length; i++) {
          out += '<option value="{0}" {1}>{2}</option>'.format(
            col.dataSource[i].value,
            val.split(',').indexOf(col.dataSource[i].value.toString()) != -1 ? 'selected' : '',
            col.dataSource[i].text);
        }

        out += '</select>';
        return out;
      }
    case 'checkbox':
      return '<input type="checkbox" id="__{0}" {1} {2} {3}>'.format(col.name, val == 1 ? 'checked' : '', readonly, required);
    default:
      return '';
  }
};

//Cancel Edit
DBEdit.CancelEdit = function () {
  DBEdit.HideEdit();
};

//Hide Edit form
DBEdit.HideEdit = function () {
  document.getElementById('edit').style.display = 'none';
};