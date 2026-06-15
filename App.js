// App.js - نظام إدارة مخزون قطع الغيار
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList,
  Alert, Modal, ScrollView, StatusBar, BackHandler, Share,
  KeyboardAvoidingView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  dark: '#1e293b',
  light: '#f8fafc',
  white: '#ffffff',
  gray: '#64748b',
};

export default function App() {
  // ==================== الحالات الأساسية ====================
  const [parts, setParts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // ==================== نماذج الإدخال ====================
  // قطعة غيار جديدة
  const [partModalVisible, setPartModalVisible] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [partCode, setPartCode] = useState('');
  const [partName, setPartName] = useState('');
  const [partQuantity, setPartQuantity] = useState('');
  const [partMinQty, setPartMinQty] = useState('');
  const [partPrice, setPartPrice] = useState('');
  const [partLocation, setPartLocation] = useState('');
  const [partCategory, setPartCategory] = useState('');
  const [partSupplier, setPartSupplier] = useState('');
  
  // استلام
  const [inModalVisible, setInModalVisible] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [inQuantity, setInQuantity] = useState('');
  const [inRef, setInRef] = useState('');
  const [inSupplier, setInSupplier] = useState('');
  
  // صرف
  const [outModalVisible, setOutModalVisible] = useState(false);
  const [outQuantity, setOutQuantity] = useState('');
  const [outRef, setOutRef] = useState('');
  const [outDepartment, setOutDepartment] = useState('');
  
  // مورد جديد
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierMaterial, setSupplierMaterial] = useState('');
  
  // تقرير
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('شهري');
  
  // ==================== تحميل البيانات ====================
  useEffect(() => {
    loadData();
    setupBackHandler();
  }, []);
  
  const setupBackHandler = () => {
    const backAction = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
        return true;
      } else if (currentScreen !== 'dashboard') {
        setCurrentScreen('dashboard');
        return true;
      }
      BackHandler.exitApp();
      return true;
    };
    BackHandler.addEventListener('hardwareBackPress', backAction);
  };
  
  const loadData = async () => {
    try {
      const savedParts = await AsyncStorage.getItem('@spare_parts');
      if (savedParts) setParts(JSON.parse(savedParts));
      else {
        const defaultParts = [
          { id: 'PRT-001', code: 'FIL-01', name: 'فلتر زيت', quantity: 15, minQty: 5, price: 45, location: 'رف A1', category: 'فلاتر', supplier: 'شركة الفهد' },
          { id: 'PRT-002', code: 'BLT-02', name: 'سير ناقل', quantity: 8, minQty: 3, price: 120, location: 'رف B3', category: 'سيور', supplier: 'محل الشهاب' },
          { id: 'PRT-003', code: 'BRG-03', name: 'رولمان بلي', quantity: 12, minQty: 4, price: 85, location: 'رف C2', category: 'ميكانيكية', supplier: 'شركة الفهد' },
        ];
        setParts(defaultParts);
        await AsyncStorage.setItem('@spare_parts', JSON.stringify(defaultParts));
      }
      
      const savedTransactions = await AsyncStorage.getItem('@spare_transactions');
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
      else {
        const defaultTransactions = [
          { id: 'TXN-001', type: 'وارد', partName: 'فلتر زيت', quantity: 10, date: new Date().toLocaleDateString('ar-SA'), ref: 'فاتورة #101', supplier: 'شركة الفهد' },
          { id: 'TXN-002', type: 'منصرف', partName: 'سير ناقل', quantity: 2, date: new Date().toLocaleDateString('ar-SA'), ref: 'إذن صرف #50', department: 'قسم الصيانة' },
        ];
        setTransactions(defaultTransactions);
        await AsyncStorage.setItem('@spare_transactions', JSON.stringify(defaultTransactions));
      }
      
      const savedSuppliers = await AsyncStorage.getItem('@spare_suppliers');
      if (savedSuppliers) setSuppliers(JSON.parse(savedSuppliers));
      else {
        const defaultSuppliers = [
          { id: 'SUP-001', name: 'شركة الفهد', phone: '0501234567', material: 'فلاتر وزيوت' },
          { id: 'SUP-002', name: 'محل الشهاب', phone: '0559876543', material: 'سيور ومحامل' },
        ];
        setSuppliers(defaultSuppliers);
        await AsyncStorage.setItem('@spare_suppliers', JSON.stringify(defaultSuppliers));
      }
    } catch (error) {
      console.log('خطأ في تحميل البيانات');
    }
  };
  
  const saveData = async () => {
    await AsyncStorage.setItem('@spare_parts', JSON.stringify(parts));
    await AsyncStorage.setItem('@spare_transactions', JSON.stringify(transactions));
    await AsyncStorage.setItem('@spare_suppliers', JSON.stringify(suppliers));
  };
  
  useEffect(() => {
    saveData();
  }, [parts, transactions, suppliers]);
  
  // ==================== دوال قطع الغيار ====================
  const addPart = () => {
    if (!partCode.trim() || !partName.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال الكود والاسم');
      return;
    }
    const newPart = {
      id: `PRT-${Date.now().toString().slice(-6)}`,
      code: partCode.trim(),
      name: partName.trim(),
      quantity: parseInt(partQuantity) || 0,
      minQty: parseInt(partMinQty) || 0,
      price: parseInt(partPrice) || 0,
      location: partLocation.trim() || 'غير محدد',
      category: partCategory.trim() || 'عام',
      supplier: partSupplier.trim() || 'غير محدد',
    };
    setParts([newPart, ...parts]);
    resetPartForm();
    setPartModalVisible(false);
    Alert.alert('تم', 'تم إضافة قطعة الغيار');
  };
  
  const updatePart = () => {
    if (!partCode.trim() || !partName.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال الكود والاسم');
      return;
    }
    const updatedParts = parts.map(p => p.id === editingPart.id ? {
      ...p,
      code: partCode.trim(),
      name: partName.trim(),
      quantity: parseInt(partQuantity) || 0,
      minQty: parseInt(partMinQty) || 0,
      price: parseInt(partPrice) || 0,
      location: partLocation.trim() || 'غير محدد',
      category: partCategory.trim() || 'عام',
      supplier: partSupplier.trim() || 'غير محدد',
    } : p);
    setParts(updatedParts);
    resetPartForm();
    setPartModalVisible(false);
    setEditingPart(null);
    Alert.alert('تم', 'تم تعديل قطعة الغيار');
  };
  
  const deletePart = (id, name) => {
    Alert.alert('حذف', `حذف "${name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', onPress: () => {
        setParts(parts.filter(p => p.id !== id));
        Alert.alert('تم', 'تم حذف القطعة');
      }}
    ]);
  };
  
  const resetPartForm = () => {
    setPartCode('');
    setPartName('');
    setPartQuantity('');
    setPartMinQty('');
    setPartPrice('');
    setPartLocation('');
    setPartCategory('');
    setPartSupplier('');
  };
  
  const openEditPart = (part) => {
    setEditingPart(part);
    setPartCode(part.code);
    setPartName(part.name);
    setPartQuantity(part.quantity.toString());
    setPartMinQty(part.minQty.toString());
    setPartPrice(part.price.toString());
    setPartLocation(part.location);
    setPartCategory(part.category);
    setPartSupplier(part.supplier);
    setPartModalVisible(true);
  };
  
  // ==================== دوال الاستلام والصرف ====================
  const handleStockIn = () => {
    if (!selectedPartId || !inQuantity) {
      Alert.alert('تنبيه', 'الرجاء اختيار القطعة وإدخال الكمية');
      return;
    }
    const qty = parseInt(inQuantity);
    if (qty <= 0) {
      Alert.alert('خطأ', 'الكمية يجب أن تكون أكبر من صفر');
      return;
    }
    const partIndex = parts.findIndex(p => p.id === selectedPartId);
    if (partIndex === -1) {
      Alert.alert('خطأ', 'القطعة غير موجودة');
      return;
    }
    const updatedParts = [...parts];
    updatedParts[partIndex].quantity += qty;
    setParts(updatedParts);
    
    const newTransaction = {
      id: `TXN-${Date.now().toString().slice(-8)}`,
      type: 'وارد',
      partName: parts[partIndex].name,
      partCode: parts[partIndex].code,
      quantity: qty,
      date: new Date().toLocaleDateString('ar-SA'),
      ref: inRef || 'فاتورة',
      supplier: inSupplier,
    };
    setTransactions([newTransaction, ...transactions]);
    
    setInModalVisible(false);
    setSelectedPartId('');
    setInQuantity('');
    setInRef('');
    setInSupplier('');
    Alert.alert('تم', 'تم تسجيل الاستلام');
  };
  
  const handleStockOut = () => {
    if (!selectedPartId || !outQuantity) {
      Alert.alert('تنبيه', 'الرجاء اختيار القطعة وإدخال الكمية');
      return;
    }
    const qty = parseInt(outQuantity);
    if (qty <= 0) {
      Alert.alert('خطأ', 'الكمية يجب أن تكون أكبر من صفر');
      return;
    }
    const partIndex = parts.findIndex(p => p.id === selectedPartId);
    if (partIndex === -1) {
      Alert.alert('خطأ', 'القطعة غير موجودة');
      return;
    }
    if (parts[partIndex].quantity < qty) {
      Alert.alert('خطأ', `الكمية المتاحة: ${parts[partIndex].quantity}`);
      return;
    }
    const updatedParts = [...parts];
    updatedParts[partIndex].quantity -= qty;
    setParts(updatedParts);
    
    const newTransaction = {
      id: `TXN-${Date.now().toString().slice(-8)}`,
      type: 'منصرف',
      partName: parts[partIndex].name,
      partCode: parts[partIndex].code,
      quantity: qty,
      date: new Date().toLocaleDateString('ar-SA'),
      ref: outRef || 'إذن صرف',
      department: outDepartment,
    };
    setTransactions([newTransaction, ...transactions]);
    
    setOutModalVisible(false);
    setSelectedPartId('');
    setOutQuantity('');
    setOutRef('');
    setOutDepartment('');
    Alert.alert('تم', 'تم تسجيل الصرف');
    
    if (updatedParts[partIndex].quantity <= updatedParts[partIndex].minQty) {
      Alert.alert('⚠️ تنبيه', `قطعة الغيار "${updatedParts[partIndex].name}" وصلت إلى الحد الأدنى للمخزون (${updatedParts[partIndex].minQty})`);
    }
  };
  
  // ==================== الموردين ====================
  const addSupplier = () => {
    if (!supplierName.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال اسم المورد');
      return;
    }
    const newSupplier = {
      id: `SUP-${Date.now().toString().slice(-6)}`,
      name: supplierName.trim(),
      phone: supplierPhone,
      material: supplierMaterial,
    };
    setSuppliers([newSupplier, ...suppliers]);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierMaterial('');
    setSupplierModalVisible(false);
    Alert.alert('تم', 'تم إضافة المورد');
  };
  
  // ==================== التقارير ====================
  const exportReport = async () => {
    let report = 'تقرير مخزون قطع الغيار\n';
    report += '='.repeat(50) + '\n\n';
    report += `التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n\n`;
    report += 'قطع الغيار:\n';
    report += '-'.repeat(50) + '\n';
    parts.forEach(p => {
      report += `الكود: ${p.code}\n`;
      report += `الاسم: ${p.name}\n`;
      report += `الكمية: ${p.quantity} | الحد الأدنى: ${p.minQty}\n`;
      report += `السعر: ${p.price} ريال | الموقع: ${p.location}\n`;
      report += `التصنيف: ${p.category} | المورد: ${p.supplier}\n`;
      report += `الحالة: ${p.quantity === 0 ? '⚠️ نفد' : p.quantity <= p.minQty ? '⚠️ منخفض' : '✓ متوفر'}\n`;
      report += '-'.repeat(50) + '\n';
    });
    
    report += '\nآخر الحركات:\n';
    report += '-'.repeat(50) + '\n';
    transactions.slice(0, 20).forEach(t => {
      report += `${t.date}: ${t.type} ${t.quantity} من ${t.partName} (${t.partCode})\n`;
    });
    
    await Share.share({ message: report, title: 'تقرير المخزون' });
  };
  
  // ==================== إحصائيات ====================
  const totalParts = parts.length;
  const lowStockParts = parts.filter(p => p.quantity > 0 && p.quantity <= p.minQty).length;
  const outOfStockParts = parts.filter(p => p.quantity === 0).length;
  const totalValue = parts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
  
  const getPartStatus = (part) => {
    if (part.quantity === 0) return { text: 'نفد', color: COLORS.danger };
    if (part.quantity <= part.minQty) return { text: 'منخفض', color: COLORS.warning };
    return { text: 'متوفر', color: COLORS.success };
  };
  
  const colors = {
    background: darkMode ? '#1a1a2e' : '#f5f5f5',
    cardBg: darkMode ? '#16213e' : '#ffffff',
    text: darkMode ? '#eeeeee' : '#333333',
    textSecondary: darkMode ? '#aaaaaa' : '#666666',
    border: darkMode ? '#0f3460' : '#e0e0e0',
    primary: '#3b82f6',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
  };
  
  const renderPart = ({ item }) => {
    const status = getPartStatus(item);
    return (
      <TouchableOpacity
        style={[styles.partCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
        onPress={() => openEditPart(item)}
        onLongPress={() => deletePart(item.id, item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.partHeader}>
          <View>
            <Text style={[styles.partName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.partCode, { color: colors.primary }]}>{item.code}</Text>
          </View>
          <Text style={[styles.partStatus, { color: status.color }]}>{status.text}</Text>
        </View>
        <View style={styles.partDetails}>
          <Text style={[styles.partQuantity, { color: colors.text }]}>الكمية: {item.quantity}</Text>
          <Text style={[styles.partMinQty, { color: colors.textSecondary }]}>الحد الأدنى: {item.minQty}</Text>
        </View>
        <View style={styles.partDetails}>
          <Text style={[styles.partPrice, { color: colors.text }]}>{item.price} ريال</Text>
          <Text style={[styles.partLocation, { color: colors.textSecondary }]}>📍 {item.location}</Text>
        </View>
        <Text style={[styles.partCategory, { color: colors.textSecondary }]}>📂 {item.category}</Text>
        <Text style={[styles.partSupplier, { color: colors.textSecondary }]}>🏢 {item.supplier}</Text>
        <View style={styles.partActions}>
          <TouchableOpacity onPress={() => {
            setSelectedPartId(item.id);
            setInModalVisible(true);
          }} style={[styles.actionBtn, { backgroundColor: colors.success }]}>
            <Text style={styles.actionBtnText}>📥 استلام</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            setSelectedPartId(item.id);
            setOutModalVisible(true);
          }} style={[styles.actionBtn, { backgroundColor: colors.warning }]}>
            <Text style={styles.actionBtnText}>📤 صرف</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  
  const filteredParts = parts.filter(p =>
    p.name.includes(searchQuery) ||
    p.code.includes(searchQuery) ||
    p.category.includes(searchQuery) ||
    p.supplier.includes(searchQuery)
  );
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      
      {/* الرأس */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>🔧 إدارة مخزون قطع الغيار</Text>
        <TouchableOpacity onPress={() => setIsMenuOpen(!isMenuOpen)} style={styles.menuBtn}>
          <Text style={{ fontSize: 24, color: colors.text }}>☰</Text>
        </TouchableOpacity>
      </View>
      
      {/* شاشة لوحة التحكم */}
      {currentScreen === 'dashboard' && (
        <ScrollView style={styles.container}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>مرحباً بك 👋</Text>
          
          <View style={styles.grid}>
            <View style={[styles.card, { borderColor: colors.primary, borderTopWidth: 4 }]}>
              <Text style={[styles.cardValue, { color: colors.primary }]}>{totalParts}</Text>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>إجمالي القطع</Text>
            </View>
            <View style={[styles.card, { borderColor: colors.warning, borderTopWidth: 4 }]}>
              <Text style={[styles.cardValue, { color: colors.warning }]}>{lowStockParts}</Text>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>منخفض المخزون</Text>
            </View>
            <View style={[styles.card, { borderColor: colors.danger, borderTopWidth: 4 }]}>
              <Text style={[styles.cardValue, { color: colors.danger }]}>{outOfStockParts}</Text>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>نفد المخزون</Text>
            </View>
          </View>
          
          <View style={styles.grid}>
            <View style={[styles.card, { borderColor: colors.success, borderTopWidth: 4 }]}>
              <Text style={[styles.cardValue, { color: colors.success }]}>{totalValue}</Text>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>قيمة المخزون</Text>
            </View>
            <View style={[styles.card, { borderColor: colors.primary, borderTopWidth: 4 }]}>
              <Text style={[styles.cardValue, { color: colors.primary }]}>{suppliers.length}</Text>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>عدد الموردين</Text>
            </View>
          </View>
          
          {/* أزرار سريعة */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.success }]} onPress={() => setPartModalVisible(true)}>
              <Text style={styles.quickBtnText}>➕ قطعة غيار</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.primary }]} onPress={() => setInModalVisible(true)}>
              <Text style={styles.quickBtnText}>📥 استلام</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.warning }]} onPress={() => setOutModalVisible(true)}>
              <Text style={styles.quickBtnText}>📤 صرف</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => setSupplierModalVisible(true)}>
              <Text style={styles.quickBtnText}>🏢 مورد</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#ec4899' }]} onPress={exportReport}>
              <Text style={styles.quickBtnText}>📊 تقرير</Text>
            </TouchableOpacity>
          </View>
          
          {/* آخر الحركات */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 آخر الحركات</Text>
          {transactions.slice(0, 5).map(tx => (
            <View key={tx.id} style={[styles.transactionItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={[styles.transactionBadge, { backgroundColor: tx.type === 'وارد' ? '#d1fae5' : '#fee2e2' }]}>
                <Text style={{ color: tx.type === 'وارد' ? '#065f46' : '#991b1b' }}>{tx.type} ({tx.quantity})</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.transactionName, { color: colors.text }]}>{tx.partName}</Text>
                <Text style={[styles.transactionCode, { color: colors.textSecondary }]}>{tx.partCode}</Text>
                <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>{tx.date} | {tx.ref}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      
      {/* شاشة قطع الغيار */}
      {currentScreen === 'parts' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={{ fontSize: 18, marginRight: 10 }}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="بحث بالكود، الاسم، التصنيف، أو المورد..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity onPress={() => setPartModalVisible(true)}>
              <Text style={{ fontSize: 20, color: colors.primary }}>➕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredParts}
            keyExtractor={item => item.id}
            renderItem={renderPart}
            contentContainerStyle={styles.partsList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
      
      {/* ==================== النوافذ المنبثقة ==================== */}
      
      {/* نافذة إضافة/تعديل قطعة غيار */}
      <Modal visible={partModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingPart ? '✏️ تعديل قطعة غيار' : '➕ إضافة قطعة غيار'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="الكود *"
              placeholderTextColor={colors.textSecondary}
              value={partCode}
              onChangeText={setPartCode}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="الاسم *"
              placeholderTextColor={colors.textSecondary}
              value={partName}
              onChangeText={setPartName}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="الكمية"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={partQuantity}
                onChangeText={setPartQuantity}
              />
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="الحد الأدنى"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={partMinQty}
                onChangeText={setPartMinQty}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="السعر"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={partPrice}
                onChangeText={setPartPrice}
              />
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="الموقع"
                placeholderTextColor={colors.textSecondary}
                value={partLocation}
                onChangeText={setPartLocation}
              />
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="التصنيف"
              placeholderTextColor={colors.textSecondary}
              value={partCategory}
              onChangeText={setPartCategory}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="المورد"
              placeholderTextColor={colors.textSecondary}
              value={partSupplier}
              onChangeText={setPartSupplier}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#64748b' }]} onPress={() => {
                setPartModalVisible(false);
                setEditingPart(null);
                resetPartForm();
              }}>
                <Text style={styles.modalBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={editingPart ? updatePart : addPart}>
                <Text style={styles.modalBtnText}>{editingPart ? 'تعديل' : 'إضافة'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      
      {/* نافذة استلام */}
      <Modal visible={inModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>📥 استلام قطع غيار</Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {parts.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pickerOption, { backgroundColor: selectedPartId === p.id ? colors.primary : colors.background }]}
                    onPress={() => setSelectedPartId(p.id)}
                  >
                    <Text style={{ color: selectedPartId === p.id ? '#fff' : colors.text }}>{p.name} ({p.code})</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="الكمية"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={inQuantity}
              onChangeText={setInQuantity}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="رقم الفاتورة/الإذن"
              placeholderTextColor={colors.textSecondary}
              value={inRef}
              onChangeText={setInRef}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="المورد"
              placeholderTextColor={colors.textSecondary}
              value={inSupplier}
              onChangeText={setInSupplier}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#64748b' }]} onPress={() => {
                setInModalVisible(false);
                setSelectedPartId('');
                setInQuantity('');
                setInRef('');
                setInSupplier('');
              }}>
                <Text style={styles.modalBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.success }]} onPress={handleStockIn}>
                <Text style={styles.modalBtnText}>تسجيل الاستلام</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* نافذة صرف */}
      <Modal visible={outModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>📤 صرف قطع غيار</Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {parts.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pickerOption, { backgroundColor: selectedPartId === p.id ? colors.primary : colors.background }]}
                    onPress={() => setSelectedPartId(p.id)}
                  >
                    <Text style={{ color: selectedPartId === p.id ? '#fff' : colors.text }}>{p.name} ({p.code}) - {p.quantity}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="الكمية"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={outQuantity}
              onChangeText={setOutQuantity}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="رقم إذن الصرف"
              placeholderTextColor={colors.textSecondary}
              value={outRef}
              onChangeText={setOutRef}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="الجهة المستلمة"
              placeholderTextColor={colors.textSecondary}
              value={outDepartment}
              onChangeText={setOutDepartment}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#64748b' }]} onPress={() => {
                setOutModalVisible(false);
                setSelectedPartId('');
                setOutQuantity('');
                setOutRef('');
                setOutDepartment('');
              }}>
                <Text style={styles.modalBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.warning }]} onPress={handleStockOut}>
                <Text style={styles.modalBtnText}>تسجيل الصرف</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* نافذة إضافة مورد */}
      <Modal visible={supplierModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🏢 إضافة مورد</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="اسم المورد"
              placeholderTextColor={colors.textSecondary}
              value={supplierName}
              onChangeText={setSupplierName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="رقم الهاتف"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={supplierPhone}
              onChangeText={setSupplierPhone}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="المواد الموردة"
              placeholderTextColor={colors.textSecondary}
              value={supplierMaterial}
              onChangeText={setSupplierMaterial}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#64748b' }]} onPress={() => setSupplierModalVisible(false)}>
                <Text style={styles.modalBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={addSupplier}>
                <Text style={styles.modalBtnText}>إضافة</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 15 }]}>📋 الموردون المسجلون</Text>
            <ScrollView style={{ maxHeight: 150 }}>
              {suppliers.map(s => (
                <View key={s.id} style={[styles.supplierItem, { borderColor: colors.border }]}>
                  <View><Text style={{ fontWeight: 'bold' }}>{s.name}</Text><Text style={{ fontSize: 11 }}>{s.phone}</Text></View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* القائمة الجانبية */}
      {isMenuOpen && (
        <View style={styles.customDrawer}>
          <Text style={styles.drawerHeader}>📋 القائمة</Text>
          <TouchableOpacity onPress={() => { setCurrentScreen('dashboard'); setIsMenuOpen(false); }} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>📊 لوحة التحكم</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCurrentScreen('parts'); setIsMenuOpen(false); }} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>🔧 قطع الغيار</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setInModalVisible(true); setIsMenuOpen(false); }} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>📥 استلام</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setOutModalVisible(true); setIsMenuOpen(false); }} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>📤 صرف</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setSupplierModalVisible(true); setIsMenuOpen(false); }} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>🏢 الموردون</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { exportReport(); setIsMenuOpen(false); }} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>📊 تقرير</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDarkMode(!darkMode); setIsMenuOpen(false); }} style={styles.drawerItem}>
            <Text style={styles.drawerItemText}>{darkMode ? '☀️' : '🌙'} الوضع</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  menuBtn: { padding: 8 },
  welcomeText: { fontSize: 17, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  card: { flex: 1, margin: 4, padding: 14, borderRadius: 12, alignItems: 'center', elevation: 2, backgroundColor: '#fff' },
  cardValue: { fontSize: 22, fontWeight: 'bold' },
  cardLabel: { fontSize: 11, textAlign: 'center', marginTop: 4 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 8, flexWrap: 'wrap' },
  quickBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', minWidth: 80 },
  quickBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginVertical: 10, textAlign: 'right' },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 15, marginBottom: 10, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 25, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 16, padding: 0, textAlign: 'right' },
  partsList: { paddingHorizontal: 15, paddingBottom: 20 },
  partCard: { padding: 15, borderRadius: 15, marginBottom: 12, borderWidth: 1 },
  partHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  partName: { fontSize: 16, fontWeight: 'bold' },
  partCode: { fontSize: 12, marginTop: 2 },
  partStatus: { fontSize: 12, fontWeight: 'bold' },
  partDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  partQuantity: { fontSize: 14 },
  partMinQty: { fontSize: 12 },
  partPrice: { fontSize: 14 },
  partLocation: { fontSize: 12 },
  partCategory: { fontSize: 12, marginTop: 4 },
  partSupplier: { fontSize: 11, marginTop: 2 },
  partActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  actionBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { color: '#fff', fontWeight: 'bold' },
  transactionItem: { padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  transactionBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  transactionName: { fontWeight: 'bold', fontSize: 14 },
  transactionCode: { fontSize: 11 },
  transactionDate: { fontSize: 10, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 15, textAlign: 'right' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  pickerContainer: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 15 },
  pickerOption: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  supplierItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderWidth: 1, borderRadius: 10, marginBottom: 8 },
  customDrawer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 240, backgroundColor: '#1e293b', padding: 15, zIndex: 999 },
  drawerHeader: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 10 },
  drawerItem: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#334155', alignItems: 'flex-end', paddingHorizontal: 8, borderRadius: 6 },
  drawerItemText: { color: '#f8fafc', fontSize: 13, fontWeight: '500' },
});
