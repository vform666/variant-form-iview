/**
 * author: vformAdmin
 * email: vdpadmin@163.com
 * website: http://www.vform666.com/
 * date: 2021.08.18
 * remark: 如果要分发VForm源码，需在本文件顶部保留此文件头信息！！
 */

import {deepClone, generateId, overwriteObj} from "@/utils/util"
import {advancedFields, basicFields, containers} from "./widget-panel/widgetsConfig.js";
import {VARIANT_FORM_VERSION} from "@/utils/config";

export function createDesigner(vueInstance) {
  let defaultFormConfig = {
    modelName: 'formData',
    refName: 'vForm',
    rulesName: 'rules',
    labelWidth: 80,
    labelPosition: 'left',
    size: '',
    labelAlign: 'label-left-align',
    cssCode: '',
    customClass: '',
    functions: '',
    layoutType: 'PC',

    onFormCreated: '',
    onFormMounted: '',
    onFormDataChange: '',
  }

  return {
    widgetList: [],
    formConfig: {cssCode: ''},

    selectedId: null,
    selectedWidget: null,
    selectedWidgetName: null,  //选中组件名称（唯一）
    vueInstance: vueInstance,

    formWidget: null,  //表单设计容器

    historyData: {
      index: -1,  //index: 0,
      maxStep: 20,
      steps: [],
    },

    initDesigner() {
      this.widgetList = []
      this.formConfig = deepClone(defaultFormConfig)

      //输出版本信息和语雀链接
      console.info(`%cVariantForm %cVer${VARIANT_FORM_VERSION} %chttps://www.yuque.com/variantdev/vform`,
          "color:#409EFF;font-size: 22px;font-weight:bolder",
          "color:#999;font-size: 12px",
          "color:#333"
      )

      this.initHistoryData()
    },

    clearDesigner() {
      let emptyWidgetListFlag = (this.widgetList.length === 0)
      this.widgetList = []
      this.selectedId = null
      this.selectedWidgetName = null
      this.selectedWidget = {}  //this.selectedWidget = null
      overwriteObj(this.formConfig, defaultFormConfig) //

      if (!emptyWidgetListFlag) {
        this.emitHistoryChange()
      } else {
        this.saveCurrentHistoryStep()
      }
    },

    getLayoutType() {
      return this.formConfig.layoutType || 'PC'
    },

    changeLayoutType(newType) {
      this.formConfig.layoutType = newType
    },

    getImportTemplate() {
      return {
        widgetList: [],
        formConfig: deepClone(this.formConfig)
      }
    },

    loadFormJson(formJson) {
      let modifiedFlag = false

      if (!!formJson && !!formJson.widgetList) {
        this.widgetList = formJson.widgetList
        modifiedFlag = true
      }
      if (!!formJson && !!formJson.formConfig) {
        //this.formConfig = importObj.formConfig
        overwriteObj(this.formConfig, formJson.formConfig)  /* 用=赋值，会导致inject依赖注入的formConfig属性变成非响应式 */
        modifiedFlag = true
      }

      return modifiedFlag
    },

    setSelected(selected) {
      if (!selected) {
        this.clearSelected()
        return
      }

      this.selectedWidget = selected
      if (!!selected.id) {
        this.selectedId = selected.id
        this.selectedWidgetName = selected.options.name
      }
    },

    updateSelectedWidgetNameAndRef(selectedWidget, newName) {
      this.selectedWidgetName = newName
      selectedWidget.options.name = newName
    },

    clearSelected() {
      this.selectedId = null
      this.selectedWidgetName = null
      this.selectedWidget = {}  //this.selectedWidget = null
    },

    checkWidgetMove(evt) { /* Only field widget can be dragged into sub-form */
      if (!!evt.draggedContext && !!evt.draggedContext.element) {
        let wgCategory = evt.draggedContext.element.category
        if (!!evt.to) {
          if ((evt.to.className === 'sub-form-table') && (wgCategory === 'container')) {
            //this.$Message.info(this.vueInstance.i18nt('designer.hint.onlyFieldWidgetAcceptable'))
            return false
          }
        }
      }

      return true
    },

    insertTableRow(widget, insertPos, cloneRowIdx) {
      let rowIdx = (insertPos === undefined) ? widget.rows.length : insertPos  //确定插入列位置
      let newRow = (cloneRowIdx === undefined) ? deepClone(widget.rows[widget.rows.length - 1]) : deepClone( widget.rows[cloneRowIdx] )
      newRow.id = 'table-row-' + generateId()
      newRow.merged = false
      newRow.cols.forEach(col => {
        col.id = 'table-cell-' + generateId()
        col.options.name = col.id
        col.merged = false
        col.options.colspan = 1
        col.options.rowspan = 1
      })
      widget.rows.splice(rowIdx, 0, newRow)

      let colNo = 0
      while ((rowIdx < widget.rows.length - 1) && (colNo < widget.rows[0].cols.length)) {  //越界判断
        let rowMerged = widget.rows[rowIdx + 1].cols[colNo].merged  //确定插入位置的单元格是否为合并单元格
        if (!!rowMerged) {
          let rowArray = widget.rows
          let unMergedCell = {}
          let startRowIndex = null
          for (let i = rowIdx; i >= 0; i--) {  //查找该行已合并的主单元格
            if (!rowArray[i].cols[colNo].merged && (rowArray[i].cols[colNo].options.rowspan > 1)) {
              startRowIndex = i
              unMergedCell = rowArray[i].cols[colNo]
              break
            }
          }

          let newRowspan = unMergedCell.options.rowspan + 1
          this.setPropsOfMergedRows(widget.rows, startRowIndex, colNo, unMergedCell.options.colspan, newRowspan)
          colNo += unMergedCell.options.colspan
        } else {
          colNo += 1
        }
      }

      this.emitHistoryChange()
    },

    insertTableCol(widget, insertPos) {
      let colIdx = (insertPos === undefined) ? widget.rows[0].cols.length : insertPos  //确定插入列位置
      widget.rows.forEach(row => {
        let newCol = deepClone(this.getContainerByType('table-cell'))
        newCol.id = 'table-cell-' + generateId()
        newCol.options.name = newCol.id
        newCol.merged = false
        newCol.options.colspan = 1
        newCol.options.rowspan = 1
        row.cols.splice(colIdx, 0, newCol)
      })

      let rowNo = 0
      while((colIdx < widget.rows[0].cols.length - 1) && (rowNo < widget.rows.length)) {  //越界判断
        let colMerged = widget.rows[rowNo].cols[colIdx + 1].merged  //确定插入位置的单元格是否为合并单元格
        if (!!colMerged) {
          let colArray = widget.rows[rowNo].cols
          let unMergedCell = {}
          let startColIndex = null
          for (let i = colIdx; i >= 0; i--) {  //查找该行已合并的主单元格
            if (!colArray[i].merged && (colArray[i].options.colspan > 1)) {
              startColIndex = i
              unMergedCell = colArray[i]
              break
            }
          }

          let newColspan = unMergedCell.options.colspan + 1
          this.setPropsOfMergedCols(widget.rows, rowNo, startColIndex, newColspan, unMergedCell.options.rowspan)
          rowNo += unMergedCell.options.rowspan
        } else {
          rowNo += 1
        }
      }

      this.emitHistoryChange()
    },

    setPropsOfMergedCols(rowArray, startRowIndex, startColIndex, newColspan, rowspan) {
      for (let i = startRowIndex; i < startRowIndex + rowspan; i++) {
        for (let j = startColIndex; j < startColIndex + newColspan; j++) {
          if ((i === startRowIndex) && (j === startColIndex)) {
            rowArray[i].cols[j].options.colspan = newColspan  //合并后的主单元格
            continue
          }

          rowArray[i].cols[j].merged = true
          rowArray[i].cols[j].options.colspan = newColspan
          rowArray[i].cols[j].widgetList = []
        }
      }
    },

    setPropsOfMergedRows(rowArray, startRowIndex, startColIndex, colspan, newRowspan) {
      for (let i = startRowIndex; i < startRowIndex + newRowspan; i++) {
        for (let j = startColIndex; j < startColIndex + colspan; j++) {
          if ((i === startRowIndex) && (j === startColIndex)) {
            rowArray[i].cols[j].options.rowspan = newRowspan
            continue
          }

          rowArray[i].cols[j].merged = true
          rowArray[i].cols[j].options.rowspan = newRowspan
          rowArray[i].cols[j].widgetList = []
        }
      }
    },

    setPropsOfSplitCol(rowArray, startRowIndex, startColIndex, colspan, rowspan) {
      for (let i = startRowIndex; i < startRowIndex + rowspan; i++) {
        for (let j = startColIndex; j < startColIndex + colspan; j++) {
          if ((i === startRowIndex) && (j === startColIndex)) {
            rowArray[i].cols[j].options.colspan = 1
            continue
          }

          rowArray[i].cols[j].merged = false;
          rowArray[i].cols[j].options.colspan = 1
        }
      }
    },

    setPropsOfSplitRow(rowArray, startRowIndex, startColIndex, colspan, rowspan) {
      for (let i = startRowIndex; i < startRowIndex + rowspan; i++) {
        for (let j = startColIndex; j < startColIndex + colspan; j++) {
          if ((i === startRowIndex) && (j === startColIndex)) {
            rowArray[i].cols[j].options.rowspan = 1  //合并后的主单元格
            continue
          }

          rowArray[i].cols[j].merged = false;
          rowArray[i].cols[j].options.rowspan = 1
        }
      }
    },

    mergeTableCol(rowArray, colArray, curRow, curCol, leftFlag, cellWidget) {
      let mergedColIdx = !!leftFlag ? curCol : curCol + colArray[curCol].options.colspan
      let remainedColIdx = !!leftFlag ? curCol - colArray[curCol - 1].options.colspan : curCol
      if (!!colArray[mergedColIdx].widgetList && (colArray[mergedColIdx].widgetList.length > 0)) { //保留widgetList
        if (!colArray[remainedColIdx].widgetList || (colArray[remainedColIdx].widgetList.length === 0)) {
          colArray[remainedColIdx].widgetList = deepClone(colArray[mergedColIdx].widgetList)
        }
      }

      let newColspan = colArray[mergedColIdx].options.colspan * 1 + colArray[remainedColIdx].options.colspan * 1
      this.setPropsOfMergedCols(rowArray, curRow, remainedColIdx, newColspan, cellWidget.options.rowspan)

      this.emitHistoryChange()
    },

    mergeTableWholeRow(rowArray, colArray, rowIndex, colIndex) { //需要考虑操作的行存在已合并的单元格！！
      //整行所有单元格行高不一致不可合并！！
      let startRowspan = rowArray[rowIndex].cols[0].options.rowspan
      let unmatchedFlag = false
      for (let i = 1; i < rowArray[rowIndex].cols.length; i++) {
        if (rowArray[rowIndex].cols[i].options.rowspan !== startRowspan) {
          unmatchedFlag = true
          break;
        }
      }
      if (unmatchedFlag) {
        this.vueInstance.$message.info(this.vueInstance.i18nt('designer.hint.rowspanNotConsistentForMergeEntireRow'))
        return
      }

      let widgetListCols = colArray.filter((colItem) => {
        return !colItem.merged && !!colItem.widgetList && (colItem.widgetList.length > 0)
      })
      if (!!widgetListCols && (widgetListCols.length > 0)) { //保留widgetList
        if ((widgetListCols[0].id !== colArray[0].id) && (!colArray[0].widgetList ||
            colArray[0].widgetList.length <= 0)) {
          colArray[0].widgetList = deepClone( widgetListCols[0].widgetList )
        }
      }

      this.setPropsOfMergedCols(rowArray, rowIndex, 0, colArray.length, colArray[colIndex].options.rowspan)

      this.emitHistoryChange()
    },

    mergeTableRow(rowArray, curRow, curCol, aboveFlag, cellWidget) {
      let mergedRowIdx = !!aboveFlag ? curRow : curRow + cellWidget.options.rowspan
      let remainedRowIdx = !!aboveFlag ? curRow - cellWidget.options.rowspan : curRow
      if (!!rowArray[mergedRowIdx].cols[curCol].widgetList && (rowArray[mergedRowIdx].cols[curCol].widgetList.length > 0)) { //保留widgetList
        if (!rowArray[remainedRowIdx].cols[curCol].widgetList || (rowArray[remainedRowIdx].cols[curCol].widgetList.length === 0)) {
          rowArray[remainedRowIdx].cols[curCol].widgetList = deepClone(rowArray[mergedRowIdx].cols[curCol].widgetList)
        }
      }

      let newRowspan = rowArray[mergedRowIdx].cols[curCol].options.rowspan * 1 + rowArray[remainedRowIdx].cols[curCol].options.rowspan * 1
      this.setPropsOfMergedRows(rowArray, remainedRowIdx, curCol, cellWidget.options.colspan, newRowspan)

      this.emitHistoryChange()
    },

    mergeTableWholeCol(rowArray, colArray, rowIndex, colIndex) { //需要考虑操作的列存在已合并的单元格！！
      //整列所有单元格列宽不一致不可合并！！
      let startColspan = rowArray[0].cols[colIndex].options.colspan
      let unmatchedFlag = false
      for (let i = 1; i < rowArray.length; i++) {
        if (rowArray[i].cols[colIndex].options.colspan !== startColspan) {
          unmatchedFlag = true
          break;
        }
      }
      if (unmatchedFlag) {
        this.vueInstance.$message.info(this.vueInstance.i18nt('designer.hint.colspanNotConsistentForMergeEntireColumn'))
        return
      }

      let widgetListCols = []
      rowArray.forEach(rowItem => {
        let tempCell = rowItem.cols[colIndex]
        if (!tempCell.merged && !!tempCell.widgetList && (tempCell.widgetList.length > 0)) {
          widgetListCols.push(tempCell)
        }
      })

      let firstCellOfCol = rowArray[0].cols[colIndex]
      if (!!widgetListCols && (widgetListCols.length > 0)) { //保留widgetList
        if ((widgetListCols[0].id !== firstCellOfCol.id) && (!firstCellOfCol.widgetList ||
            firstCellOfCol.widgetList.length <= 0)) {
          firstCellOfCol.widgetList = deepClone( widgetListCols[0].widgetList )
        }
      }

      this.setPropsOfMergedRows(rowArray, 0, colIndex, firstCellOfCol.options.colspan, rowArray.length)

      this.emitHistoryChange()
    },

    undoMergeTableCol(rowArray, rowIndex, colIndex, colspan, rowspan) {
      this.setPropsOfSplitCol(rowArray, rowIndex, colIndex, colspan, rowspan)

      this.emitHistoryChange()
    },

    undoMergeTableRow(rowArray, rowIndex, colIndex, colspan, rowspan) {
      this.setPropsOfSplitRow(rowArray, rowIndex, colIndex, colspan, rowspan)

      this.emitHistoryChange()
    },

    deleteTableWholeCol(rowArray, colIndex) { //需考虑删除的是合并列！！
      //仅剩一列则不可删除！！
      if (rowArray[0].cols[0].options.colspan === rowArray[0].cols.length) {
        return
      }

      //整列所有单元格列宽不一致不可删除！！
      let startColspan = rowArray[0].cols[colIndex].options.colspan
      let unmatchedFlag = false
      for (let i = 1; i < rowArray.length; i++) {
        if (rowArray[i].cols[colIndex].options.colspan !== startColspan) {
          unmatchedFlag = true
          break;
        }
      }
      if (unmatchedFlag) {
        this.vueInstance.$message.info(this.vueInstance.i18nt('designer.hint.colspanNotConsistentForDeleteEntireColumn'))
        return
      }

      rowArray.forEach((rItem) => {
        rItem.cols.splice(colIndex, startColspan)
      })

      this.emitHistoryChange()
    },

    deleteTableWholeRow(rowArray, rowIndex) { //需考虑删除的是合并行！！
      //仅剩一行则不可删除！！
      if (rowArray[0].cols[0].options.rowspan === rowArray.length) {
        return
      }

      //整行所有单元格行高不一致不可删除！！
      let startRowspan = rowArray[rowIndex].cols[0].options.rowspan
      let unmatchedFlag = false
      for (let i = 1; i < rowArray[rowIndex].cols.length; i++) {
        if (rowArray[rowIndex].cols[i].options.rowspan !== startRowspan) {
          unmatchedFlag = true
          break;
        }
      }
      if (unmatchedFlag) {
        this.vueInstance.$message.info(this.vueInstance.i18nt('designer.hint.rowspanNotConsistentForDeleteEntireRow'))
        return
      }

      rowArray.splice(rowIndex, startRowspan)

      this.emitHistoryChange()
    },

    getContainerByType(typeName) {
      let foundCon = null
      containers.forEach(con => {
        if (!!con.type && (con.type === typeName)) {
          foundCon = con
        }
      })

      return foundCon
    },

    getFieldWidgetByType(typeName) {
      let foundWidget = null
      basicFields.forEach(bf => {
        if (!!bf.type && (bf.type === typeName)) {
          foundWidget = bf
        }
      })

      if (!!foundWidget) {
        return foundWidget
      }

      advancedFields.forEach(af => {
        if (!!af.type && (af.type === typeName)) {
          foundWidget = af
        }
      })

      return foundWidget
    },

    hasConfig(widget, configName) {
      let originalWidget = null
      if (!!widget.category) {
        originalWidget = this.getContainerByType(widget.type)
      } else {
        originalWidget = this.getFieldWidgetByType(widget.type)
      }

      if (!originalWidget || !originalWidget.options) {
        return false
      }

      return Object.keys(originalWidget.options).indexOf(configName) > -1
    },

    cloneGridCol(widget, parentWidget) {
      let newGridCol = deepClone(this.getContainerByType('grid-col'))
      newGridCol.options.span = widget.options.span
      let tmpId = generateId()
      newGridCol.id = 'grid-col-' + tmpId
      newGridCol.options.name = 'gridCol' + tmpId

      parentWidget.cols.push(newGridCol)
    },

    cloneContainer(containWidget) {
      if (containWidget.type === 'grid') {
        let newGrid = deepClone(this.getContainerByType('grid'))
        newGrid.id = newGrid.type + generateId()
        newGrid.options.name = newGrid.id
        containWidget.cols.forEach(gridCol => {
          let newGridCol = deepClone(this.getContainerByType('grid-col'))
          let tmpId = generateId()
          newGridCol.id = 'grid-col-' + tmpId
          newGridCol.options.name = 'gridCol' + tmpId
          newGridCol.options.span = gridCol.options.span
          newGrid.cols.push(newGridCol)
        })

        return newGrid
      } else if (containWidget.type === 'table') {
        let newTable = deepClone(this.getContainerByType('table'))
        newTable.id = newTable.type + generateId()
        newTable.options.name = newTable.id
        containWidget.rows.forEach(tRow => {
          let newRow = deepClone(tRow)
          newRow.id = 'table-row-' + generateId()
          newRow.cols.forEach(col => {
            col.id = 'table-cell-' + generateId()
            col.options.name = col.id
            col.widgetList = []  //清空组件列表
          })
          newTable.rows.push(newRow)
        })

        return newTable
      } else {
        return null
      }
    },

    moveUpWidget(parentList, indexOfParentList) {
      if (!!parentList) {
        if (indexOfParentList === 0) {
          this.vueInstance.$message(this.vueInstance.i18nt('designer.hint.moveUpFirstChildHint'))
          return
        }

        let tempWidget = parentList[indexOfParentList]
        parentList.splice(indexOfParentList, 1)
        parentList.splice(indexOfParentList - 1, 0, tempWidget)
      }
    },

    moveDownWidget(parentList, indexOfParentList) {
      if (!!parentList) {
        if (indexOfParentList === parentList.length - 1) {
          this.vueInstance.$message(this.vueInstance.i18nt('designer.hint.moveDownLastChildHint'))
          return
        }

        let tempWidget = parentList[indexOfParentList]
        parentList.splice(indexOfParentList, 1)
        parentList.splice(indexOfParentList + 1, 0, tempWidget)
      }
    },

    copyNewFieldWidget(origin) {
      let newWidget = deepClone(origin)
      let tempId = generateId()
      newWidget.id = newWidget.type.replace(/-/g, '') + tempId
      newWidget.options.name = newWidget.id
      newWidget.options.label = newWidget.type.toLowerCase()

      delete newWidget.displayName
      return newWidget
    },

    copyNewContainerWidget(origin) {
      let newCon = deepClone(origin)
      newCon.id = newCon.type.replace(/-/g, '') + generateId()
      newCon.options.name = newCon.id
      if (newCon.type === 'grid') {
        let newCol = deepClone( this.getContainerByType('grid-col') )
        let tmpId = generateId()
        newCol.id = 'grid-col-' + tmpId
        newCol.options.name = 'gridCol' + tmpId
        newCon.cols.push(newCol)
        //
        newCol = deepClone(newCol)
        tmpId = generateId()
        newCol.id = 'grid-col-' + tmpId
        newCol.options.name = 'gridCol' + tmpId
        newCon.cols.push(newCol)
      } else if (newCon.type === 'table') {
        let newRow = {cols: []}
        newRow.id = 'table-row-' + generateId()
        newRow.merged = false
        let newCell = deepClone( this.getContainerByType('table-cell') )
        newCell.id = 'table-cell-' + generateId()
        newCell.options.name = newCell.id
        newCell.merged = false
        newCell.options.colspan = 1
        newCell.options.rowspan = 1
        newRow.cols.push(newCell)
        newCon.rows.push(newRow)
      } else if (newCon.type === 'tab') {
        let newTabPane = deepClone( this.getContainerByType('tab-pane') )
        newTabPane.id = 'tab-pane-' + generateId()
        newTabPane.options.name = 'tab1'
        newTabPane.options.label = 'tab 1'
        newCon.tabs.push(newTabPane)
      }
      //newCon.options.customClass = []

      delete newCon.displayName
      return newCon
    },

    addContainerByDbClick(container) {
      let newCon = this.copyNewContainerWidget(container)
      this.widgetList.push(newCon)
      this.setSelected(newCon)
    },

    addFieldByDbClick(widget) {
      let newWidget = this.copyNewFieldWidget(widget)
      if (!!this.selectedWidget && this.selectedWidget.type === 'tab') {
        //获取当前激活的tabPane
        //TODO:
      } else if (!!this.selectedWidget && !!this.selectedWidget.widgetList) {
        this.selectedWidget.widgetList.push(newWidget)
      } else {
        this.widgetList.push(newWidget)
      }

      this.setSelected(newWidget)
    },

    deleteColOfGrid(gridWidget, colIdx) {
      if (!!gridWidget && !!gridWidget.cols) {
        gridWidget.cols.splice(colIdx, 1)
      }
    },

    addNewColOfGrid(gridWidget) {
      const cols = gridWidget.cols
      let newGridCol = deepClone(this.getContainerByType('grid-col'))
      let tmpId = generateId()
      newGridCol.id = 'grid-col-' + tmpId
      newGridCol.options.name = 'gridCol' + tmpId
      if ((!!cols) && (cols.length > 0)) {
        let spanSum = 0
        cols.forEach((col) => {
          spanSum += col.options.span
        })

        if (spanSum >= 24) {
          //this.$Message.info('列栅格之和超出24')
          console.log('列栅格之和超出24')
          gridWidget.cols.push(newGridCol)
        } else {
          newGridCol.options.span = (24 - spanSum) > 12 ? 12 : (24 - spanSum)
          gridWidget.cols.push(newGridCol)
        }
      } else {
        gridWidget.cols = [newGridCol]
      }
    },

    addTabPaneOfTabs(tabsWidget) {
      const tabPanes = tabsWidget.tabs
      let newTabPane = deepClone( this.getContainerByType('tab-pane') )
      newTabPane.id = 'tab-pane-' + generateId()
      newTabPane.options.name = newTabPane.id
      newTabPane.options.label = 'tab ' + (tabPanes.length + 1)
      tabPanes.push(newTabPane)
    },

    deleteTabPaneOfTabs(tabsWidget, tpIdx) {
      tabsWidget.tabs.splice(tpIdx, 1)
    },

    emitEvent(evtName, evtData) {  //用于兄弟组件发射事件
      this.vueInstance.$emit(evtName, evtData)
    },

    handleEvent(evtName, callback) {  //用于兄弟组件接收事件
      this.vueInstance.$on(evtName, (data) => callback(data))
    },

    registerFormWidget(formWidget) {
      this.formWidget = formWidget
    },

    initHistoryData() {
      this.loadFormContentFromStorage()
      this.historyData.index++
      this.historyData.steps[this.historyData.index] = ({
        widgetList: deepClone(this.widgetList),
        formConfig: deepClone(this.formConfig)
      })
    },

    emitHistoryChange() {
      //console.log('------------', 'Form history changed!')

      if (this.historyData.index === this.historyData.maxStep - 1) {
        this.historyData.steps.shift()
      } else {
        this.historyData.index++
      }

      this.historyData.steps[this.historyData.index] = ({
        widgetList: deepClone(this.widgetList),
        formConfig: deepClone(this.formConfig)
      })

      this.saveFormContentToStorage()

      if (this.historyData.index < this.historyData.steps.length - 1) {
        this.historyData.steps = this.historyData.steps.slice(0, this.historyData.index + 1)
      }

      console.log('history', this.historyData.index)
    },

    saveCurrentHistoryStep() {
      this.historyData.steps[this.historyData.index] = deepClone({
        widgetList: this.widgetList,
        formConfig: this.formConfig
      })

      this.saveFormContentToStorage()
    },

    undoHistoryStep() {
      if (this.historyData.index !== 0) {
        this.historyData.index--
      }
      console.log('undo', this.historyData.index)

      this.widgetList = deepClone(this.historyData.steps[this.historyData.index].widgetList)
      this.formConfig = deepClone(this.historyData.steps[this.historyData.index].formConfig)
    },

    redoHistoryStep() {
      if (this.historyData.index !== (this.historyData.steps.length - 1)) {
        this.historyData.index++
      }
      console.log('redo', this.historyData.index)

      this.widgetList = deepClone(this.historyData.steps[this.historyData.index].widgetList)
      this.formConfig = deepClone(this.historyData.steps[this.historyData.index].formConfig)
    },

    undoEnabled() {
      return (this.historyData.index > 0) && (this.historyData.steps.length > 0)
    },

    redoEnabled() {
      return this.historyData.index < (this.historyData.steps.length - 1)
    },

    saveFormContentToStorage() {
      window.localStorage.setItem('widget__list__backup', JSON.stringify(this.widgetList))
      window.localStorage.setItem('form__config__backup', JSON.stringify(this.formConfig))
    },

    loadFormContentFromStorage() {
      let widgetListBackup = window.localStorage.getItem('widget__list__backup')
      if (!!widgetListBackup) {
        this.widgetList = JSON.parse(widgetListBackup)
      }

      let formConfigBackup = window.localStorage.getItem('form__config__backup')
      if (!!formConfigBackup) {
        //this.formConfig = JSON.parse(formConfigBackup)
        overwriteObj(this.formConfig, JSON.parse(formConfigBackup))  /* 用=赋值，会导致inject依赖注入的formConfig属性变成非响应式 */
      }
    },


  }
}
