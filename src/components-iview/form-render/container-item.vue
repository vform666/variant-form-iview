<template>
	<div class="container-wrapper">

		<Row v-if="widget.type === 'grid'" :key="widget.id" :gutter="widget.options.gutter" class="grid-container"
			:class="[customClass]" :ref="widget.id" v-show="!widget.options.hidden">
			<template v-for="(colWidget, colIdx) in widget.cols">
				<grid-col-item :widget="colWidget" :key="colIdx" :parent-list="widget.cols"
					:index-of-parent-list="colIdx" :parent-widget="widget"></grid-col-item>
			</template>
		</Row>

		<div v-else-if="widget.type === 'table'" :key="widget.id" class="table-container"
			v-show="!widget.options.hidden">
			<table :ref="widget.id" class="table-layout" :class="[customClass]">
				<tbody>
					<tr v-for="(row, rowIdx) in widget.rows" :key="row.id">
						<template v-for="(colWidget, colIdx) in row.cols">
							<table-cell-item v-if="!colWidget.merged" :widget="colWidget" :key="colIdx"
								:parent-list="widget.cols" :row-index="rowIdx" :col-index="colIdx"
								:parent-widget="widget"></table-cell-item>
						</template>
					</tr>
				</tbody>
			</table>
		</div>

		<div v-else-if="widget.type === 'tab'" :key="widget.id" class="tab-container" v-show="!widget.options.hidden">
			<Tabs v-model="activeTabName" 
			:type="widget.displayType" 
			:size="widget.options.size" 
			:ref="widget.id" 
			:class="[customClass]">
				<TabPane v-for="(tab, index) in visibleTabs" :key="index" :label="tab.options.label"
					:disabled="tab.options.disabled" :name="tab.options.name">
					<template v-for="(subWidget, swIdx) in tab.widgetList">
						<template v-if="'container' === subWidget.category">
							<container-item :widget="subWidget" :key="swIdx" :parent-list="tab.widgetList"
								:index-of-parent-list="swIdx" :parent-widget="widget"></container-item>
						</template>
						<template v-else>
							<field-widget :field="subWidget" :key="swIdx" :parent-list="tab.widgetList"
								:index-of-parent-list="swIdx" :parent-widget="widget"></field-widget>
						</template>
					</template>
				</TabPane>
			</Tabs>
		</div>

		<div v-else-if="widget.type === 'sub-form'" :key="widget.id" class="sub-form-container"
			v-show="!widget.options.hidden">
			<!--      <el-form :ref="widget.id" :model="formModel" label-position="top">-->
			<Row class="header-row">
				<div class="action-header-column">
					<span class="action-label">{{i18nt('render.hint.subFormAction')}}</span>
					<Button shape="round" type="primary" size="mini" class="action-button" @click="addSubFormRow"
						:title="i18nt('render.hint.subFormAddActionHint')">
						{{i18nt('render.hint.subFormAddAction')}}<i class="ivu-icon ivu-icon-md-add el-icon-right"></i>
					</Button>
				</div>
				<template v-for="(subWidget, swIdx) in widget.widgetList">
					<div :key="subWidget.id + 'thc'" class="field-header-column"
						:class="[getLabelAlign(widget, subWidget), !!subWidget.options.required ? 'is-required' : '']"
						:style="{width: subWidget.options.columnWidth}">
						<span v-if="!!subWidget.options.labelIconClass" class="custom-label">
							<template v-if="subWidget.options.labelIconPosition === 'front'">
								<template v-if="!!subWidget.options.labelTooltip">
									<el-tooltip :content="subWidget.options.labelTooltip" effect="light">
										<i :class="subWidget.options.labelIconClass"></i>
									</el-tooltip>{{subWidget.options.label}}
								</template>
								<template v-else>
									<i
										:class="subWidget.options.labelIconClass"></i>{{subWidget.options.label}}</template>
							</template>
							<template v-else-if="subWidget.options.labelIconPosition === 'rear'">
								<template v-if="!!subWidget.options.labelTooltip">
									{{subWidget.options.label}}
									<el-tooltip :content="subWidget.options.labelTooltip" effect="light">
										<i :class="subWidget.options.labelIconClass"></i>
									</el-tooltip>
								</template>
								<template v-else>
									{{subWidget.options.label}}<i
										:class="subWidget.options.labelIconClass"></i></template>
							</template>
						</span>
						<template v-else>
							<span :title="subWidget.options.labelTooltip">{{subWidget.options.label}}</span></template>
					</div>
				</template>
			</Row>
			<Row v-for="(subFormRowId, sfrIdx) in rowIdData" class="sub-form-row" :key="subFormRowId">
				<div class="sub-form-action-column hide-label">
					<FormItem class="action-button-column">
						<Button shape="round" type="" icon="ivu-icon ivu-icon-md-add" @click="insertSubFormRow(sfrIdx)"
							:title="i18nt('render.hint.insertSubFormRow')"></Button>
						<Button shape="round" type="" icon="ivu-icon ivu-icon-ios-trash" @click="deleteSubFormRow(sfrIdx)"
							:title="i18nt('render.hint.deleteSubFormRow')"></Button>
						<span v-if="widget.options.showRowNumber" class="row-number-span">#{{sfrIdx+1}}</span>
					</FormItem>
				</div>
				<template v-for="(subWidget, swIdx) in widget.widgetList">
					<div class="sub-form-table-column hide-label" :key="subWidget.id + 'tc' + subFormRowId"
						:style="{width: subWidget.options.columnWidth}">
						<field-widget :field="fieldSchemaData[sfrIdx][swIdx]" :key="fieldSchemaData[sfrIdx][swIdx].id"
							:parent-list="widget.widgetList" :index-of-parent-list="swIdx" :parent-widget="widget"
							:sub-form-row-id="subFormRowId" :sub-form-row-index="sfrIdx" :sub-form-col-index="swIdx">
						</field-widget>
					</div>
				</template>
			</Row>
			<!--      </el-form>-->
		</div>

	</div>
</template>

<script>
	import emitter from '@/components-iview/utils/emitter.js'
	import FieldWidget from "../form-designer/form-widget/field-widget";
	import GridColItem from "./grid-col-item";
	import TableCellItem from "./table-cell-item"
	import {
		deepClone,
		generateId,
		optionExists
	} from "../../utils/util";
	import i18n from "../utils/i18n";
	import refMixin from "./refMixin";

	export default {
		name: "ContainerItem",
		componentName: 'ContainerItem',
		mixins: [emitter, i18n, refMixin],
		components: {
			GridColItem,
			TableCellItem,
			FieldWidget,

		},
		props: {
			widget: Object,
		},
		inject: ['refList', 'sfRefList', 'globalModel'],
		data() {
			return {
				activeTabName: '',
				rowIdData: [],
				fieldSchemaData: [],
			}
		},
		computed: {
			customClass() {
				return this.widget.options.customClass || ''
			},

			visibleTabs() {
				return this.widget.tabs.filter(tp => {
					return !tp.options.hidden
				})
			},

			formModel: {
				cache: false,
				get() {
					return this.globalModel.formModel
				}
			},

		},
		created() {
			this.initRefList()
			this.registerSubFormToRefList()
			this.initRowIdData(true)
			this.initFieldSchemaData()
			this.initEventHandler()
		},
		mounted() {
			this.initActiveTab()
		},
		methods: {
			getLabelAlign(widget, subWidget) {
				return subWidget.options.labelAlign || widget.options.labelAlign
			},

			initActiveTab() {
				if ((this.widget.type === 'tab') && (this.widget.tabs.length > 0)) {
					let activePanes = this.widget.tabs.filter((tp) => {
						return tp.options.active === true
					})
					if (activePanes.length > 0) {
						this.activeTabName = activePanes[0].options.name
					} else {
						this.activeTabName = this.widget.tabs[0].options.name
					}
				}
			},

			registerSubFormToRefList() {
				if (this.widget.type === 'sub-form') {
					this.sfRefList[this.widget.options.name] = this
				}
			},

			initRowIdData(initFlag) {
				if (this.widget.type === 'sub-form') {
					//this.rowIdData.length = 0
					this.rowIdData.splice(0, this.rowIdData.length) //清除数组必须用splice，length=0不会响应式更新！！
					let subFormModel = this.formModel[this.widget.options.name]
					if (!!subFormModel && (subFormModel.length > 0)) {
						subFormModel.forEach(rowModel => {
							//this.rowIdData.push('rowId' + generateId())
							this.rowIdData.push('r' + generateId())
						})

						if (!!initFlag) {
							//注意：事件触发需延期执行，SumFormDataChange事件处理代码中可能存在尚未创建完成的组件！！
							setTimeout(() => {
								this.handleSubFormRowChange(subFormModel)
							}, 800)
						}
					}
				}
			},

			addToRowIdData() {
				this.rowIdData.push('rowId' + generateId())
			},

			insertToRowIdData(rowIndex) {
				this.rowIdData.splice(rowIndex, 0, 'rowId' + generateId())
			},

			deleteFromRowIdData(rowIndex) {
				this.rowIdData.splice(rowIndex, 1)
			},

			initFieldSchemaData() { //初始化fieldSchemaData！！！
				if (this.widget.type !== 'sub-form') {
					return
				}

				let rowLength = this.rowIdData.length
				//this.fieldSchemaData.length = 0
				this.fieldSchemaData.splice(0, this.fieldSchemaData.length) //清除数组必须用splice，length=0不会响应式更新！！
				if (rowLength > 0) {
					for (let i = 0; i < rowLength; i++) {
						let fieldSchemas = []
						this.widget.widgetList.forEach(swItem => {
							fieldSchemas.push(this.cloneFieldSchema(swItem))
						})
						this.fieldSchemaData.push(fieldSchemas)
					}
				}
			},

			addToFieldSchemaData(rowIndex) {
				let fieldSchemas = []
				this.widget.widgetList.forEach(swItem => {
					fieldSchemas.push(this.cloneFieldSchema(swItem))
				})

				if (rowIndex === undefined) {
					this.fieldSchemaData.push(fieldSchemas)
				} else {
					this.fieldSchemaData.splice(rowIndex, 0, fieldSchemas)
				}
			},

			deleteFromFieldSchemaData(rowIndex) {
				this.fieldSchemaData.splice(rowIndex, 1)
			},

			cloneFieldSchema(fieldWidget) {
				let newFieldSchema = deepClone(fieldWidget)
				newFieldSchema.id = fieldWidget.type + generateId()
				return newFieldSchema
			},

			initEventHandler() {
				if (this.widget.type !== 'sub-form') {
					return
				}

				this.$on('setFormData', function(newFormData) {
					this.initRowIdData(false)
					this.initFieldSchemaData()

					let subFormData = newFormData[this.widget.options.name] || []
					setTimeout(() => { //延时触发SubFormRowChange事件, 便于更新计算字段！！
						this.handleSubFormRowChange(subFormData)
					}, 800)
				})

				// this.$on('subFormDataChange', function (subFormData) {
				//   console.log('test--------', subFormData)
				//   this.handleSubFormRowChange(subFormData)
				// })
			},

			addSubFormRow() {
				let newSubFormDataRow = {}
				this.widget.widgetList.forEach(subFormItem => {
					if (!!subFormItem.formItemFlag) {
						newSubFormDataRow[subFormItem.options.name] = subFormItem.options.defaultValue
					}
				})

				let oldSubFormData = this.formModel[this.widget.options.name] || []
				oldSubFormData.push(newSubFormDataRow)
				this.addToRowIdData()
				this.addToFieldSchemaData()

				this.handleSubFormRowAdd(oldSubFormData, oldSubFormData.length - 1)
				this.handleSubFormRowChange(oldSubFormData)
			},

			insertSubFormRow(beforeFormRowIndex) {
				let newSubFormDataRow = {}
				this.widget.widgetList.forEach(subFormItem => {
					if (!!subFormItem.formItemFlag) {
						newSubFormDataRow[subFormItem.options.name] = subFormItem.options.defaultValue
					}
				})

				let oldSubFormData = this.formModel[this.widget.options.name] || []
				oldSubFormData.splice(beforeFormRowIndex, 0, newSubFormDataRow)
				this.insertToRowIdData(beforeFormRowIndex)
				this.addToFieldSchemaData(beforeFormRowIndex)

				this.handleSubFormRowInsert(oldSubFormData, beforeFormRowIndex)
				this.handleSubFormRowChange(oldSubFormData)
			},

			deleteSubFormRow(formRowIndex) {
				this.$confirm(this.i18nt('render.hint.deleteSubFormRow') + '?', this.i18nt('render.hint.prompt'), {
					confirmButtonText: this.i18nt('render.hint.confirm'),
					cancelButtonText: this.i18nt('render.hint.cancel')
				}).then(() => {
					let oldSubFormData = this.formModel[this.widget.options.name] || []
					let deletedDataRow = deepClone(oldSubFormData[formRowIndex])
					oldSubFormData.splice(formRowIndex, 1)
					this.deleteFromRowIdData(formRowIndex)
					this.deleteFromFieldSchemaData(formRowIndex)

					this.handelSubFormRowDelete(oldSubFormData, deletedDataRow)
					this.handleSubFormRowChange(oldSubFormData)
				}).catch(() => {
					//
				})
			},

			handleSubFormRowChange(subFormData) {
				if (!!this.widget.options.onSubFormRowChange) {
					let customFunc = new Function('subFormData', this.widget.options.onSubFormRowChange)
					customFunc.call(this, subFormData)
				}
			},

			handleSubFormRowAdd(subFormData, newRowIndex) {
				if (!!this.widget.options.onSubFormRowAdd) {
					let customFunc = new Function('subFormData', 'newRowIndex', this.widget.options.onSubFormRowAdd)
					customFunc.call(this, subFormData, newRowIndex)
				}
			},

			handleSubFormRowInsert(subFormData, newRowIndex) {
				if (!!this.widget.options.onSubFormRowInsert) {
					let customFunc = new Function('subFormData', 'newRowIndex', this.widget.options.onSubFormRowInsert)
					customFunc.call(this, subFormData, newRowIndex)
				}
			},

			handelSubFormRowDelete(subFormData, deletedDataRow) {
				if (!!this.widget.options.onSubFormRowDelete) {
					let customFunc = new Function('subFormData', 'deletedDataRow', this.widget.options.onSubFormRowDelete)
					customFunc.call(this, subFormData, deletedDataRow)
				}
			},

			//--------------------- 以下为组件支持外部调用的API方法 begin ------------------//
			/* 提示：用户可自行扩充这些方法！！！ */

			setHidden(flag) {
				this.widget.options.hidden = flag
			},

			activeTab(tabIndex) { //tabIndex从0计数
				if ((tabIndex >= 0) && (tabIndex < this.widget.tabs.length)) {
					this.widget.tabs.forEach((tp, idx) => {
						tp.options.active = idx === tabIndex
						if (idx === tabIndex) {
							this.activeTabName = tp.options.name
						}
					})

				}
			},

			disableTab(tabIndex) {
				if ((tabIndex >= 0) && (tabIndex < this.widget.tabs.length)) {
					this.widget.tabs[tabIndex].options.disabled = true
				}
			},

			enableTab(tabIndex) {
				if ((tabIndex >= 0) && (tabIndex < this.widget.tabs.length)) {
					this.widget.tabs[tabIndex].options.disabled = false
				}
			},

			hideTab(tabIndex) {
				if ((tabIndex >= 0) && (tabIndex < this.widget.tabs.length)) {
					this.widget.tabs[tabIndex].options.hidden = true
				}
			},

			showTab(tabIndex) {
				if ((tabIndex >= 0) && (tabIndex < this.widget.tabs.length)) {
					this.widget.tabs[tabIndex].options.hidden = false
				}
			},

			disableSubFormRow(rowIndex) {
				this.widget.widgetList.forEach(subWidget => {
					let swRefName = subWidget.options.name + '@row' + this.rowIdData[rowIndex]
					let foundSW = this.getWidgetRef(swRefName)
					if (!!foundSW) {
						foundSW.setDisabled(true)
					}
				})
			},

			enableSubFormRow(rowIndex) {
				this.widget.widgetList.forEach(subWidget => {
					let swRefName = subWidget.options.name + '@row' + this.rowIdData[rowIndex]
					let foundSW = this.getWidgetRef(swRefName)
					if (!!foundSW) {
						foundSW.setDisabled(false)
					}
				})
			},

			disableSubForm() {
				if (this.rowIdData.length > 0) {
					this.rowIdData.forEach((dataRow, rIdx) => {
						this.disableSubFormRow(rIdx)
					})
				}
			},

			enableSubForm() {
				if (this.rowIdData.length > 0) {
					this.rowIdData.forEach((dataRow, rIdx) => {
						this.enableSubFormRow(rIdx)
					})
				}
			},

			resetSubForm() { //重置subForm数据为空
				if (this.widget.type === 'sub-form') {
					let subFormModel = this.formModel[this.widget.options.name]
					if (!!subFormModel) {
						subFormModel.splice(0, subFormModel.length)
						this.rowIdData.splice(0, this.rowIdData.length)
					}
				}
			},

			getSubFormValues(needValidation = true) {
				if (this.widget.type === 'sub-form') {
					//TODO: 逐行校验子表单！！
					return this.formModel[this.widget.options.name]
				} else {
					this.$Message.error(this.i18nt('render.hint.nonSubFormType'))
				}
			},

			validateField(fieldName) { //逐行校验子表单字段
				//TODO:
			},

			validateSubForm() { //逐行校验子表单全部字段
				//TODO:
			},

			//--------------------- 以上为组件支持外部调用的API方法 end ------------------//

		},
	}
</script>

<style lang="scss" scoped>
	div.table-container {
		table.table-layout {
			width: 100%;
			table-layout: fixed;
			border-collapse: collapse;
		}
	}

	.sub-form-container {
		margin-bottom: 8px;

		::v-deep .el-row.header-row {
			padding-bottom: 0;
		}

		::v-deep .el-row.sub-form-row {
			padding-top: 3px;
			padding-bottom: 3px;

			.row-number-span {
				margin-left: 16px;
			}
		}
	}

	div.action-header-column {
		display: inline-block;
		width: 120px;

		.action-label {
			margin-right: 12px;
		}

		.action-button {
			padding-left: 8px;
			padding-right: 8px;
		}
	}

	div.field-header-column {
		display: inline-block;
		//overflow: hidden;
		//white-space: nowrap;  //文字超出长度不自动换行
		//text-overflow: ellipsis;  //文字超出长度显示省略号

		span.custom-label i {
			margin: 0 3px;
		}
	}

	div.field-header-column.is-required:before {
		content: '*';
		color: #F56C6C;
		margin-right: 4px;
	}

	div.label-center-left {
		text-align: left;
	}

	div.label-center-align {
		text-align: center;
	}

	div.label-right-align {
		text-align: right;
	}

	div.sub-form-action-column {
		display: inline-block;
		width: 120px;

		::v-deep .el-form-item {
			margin-bottom: 0;
		}

		::v-deep .el-button {
			font-size: 18px;
			padding: 0;
			background: #DCDFE6;
			border: 4px solid #DCDFE6;
		}

	}

	div.sub-form-action-column.hide-label {
		::v-deep .el-form-item__label {
			display: none;
		}
	}

	div.sub-form-table-column {
		display: inline-block;
		//width: 200px;

		::v-deep .el-form-item {
			margin-left: 4px;
			margin-right: 4px;
			margin-bottom: 0;
		}

		::v-deep .el-form-item__content {
			margin-left: 0 !important;
		}
	}

	div.sub-form-table-column.hide-label {
		::v-deep .el-form-item__label {
			display: none;
		}
	}
</style>
