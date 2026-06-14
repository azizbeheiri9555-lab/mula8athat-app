// App.js - تطبيق ملاحظات مع نسخ احتياطي في مجلد عام (يظل بعد إلغاء التثبيت)
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList,
  Alert, Modal, ScrollView, StatusBar, Vibration, BackHandler, Share, Switch,
  KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const COLORS = [
  { id: 'white', name: 'أبيض', bg: '#ffffff', text: '#333333', icon: '⚪' },
  { id: 'yellow', name: 'أصفر', bg: '#fff9c4', text: '#333333', icon: '🟡' },
  { id: 'green', name: 'أخضر', bg: '#e8f5e9', text: '#1b5e20', icon: '🟢' },
  { id: 'blue', name: 'أزرق', bg: '#e3f2fd', text: '#0d47a1', icon: '🔵' },
  { id: 'purple', name: 'بنفسجي', bg: '#f3e5f5', text: '#4a148c', icon: '🟣' },
  { id: 'pink', name: 'وردي', bg: '#fce4ec', text: '#880e4f', icon: '🌸' },
];

const TAGS = [
  { id: 'work', name: 'عمل', icon: '💼' },
  { id: 'personal', name: 'شخصي', icon: '👤' },
  { id: 'ideas', name: 'أفكار', icon: '💡' },
  { id: 'important', name: 'مهم', icon: '⭐' },
  { id: 'shopping', name: 'تسوق', icon: '🛒' },
];

const DEFAULT_PASSWORD = '1234';

export default function App() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [notes, setNotes] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(COLORS[0]);
  const [editingFolder, setEditingFolder] = useState(null);
  
  const [noteViewVisible, setNoteViewVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewOnlyNote, setViewOnlyNote] = useState(null);
  const [currentNote, setCurrentNote] = useState({
    id: null, title: '', content: '', color: COLORS[0], tags: [],
    checklist: [], links: [], isLocked: false, lockPassword: '',
    isPinned: false, isFavorite: false
  });
  
  const [checklistItem, setChecklistItem] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [linkName, setLinkName] = useState('');
  const [trash, setTrash] = useState([]);
  const [showTrash, setShowTrash] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockPasswordInput, setLockPasswordInput] = useState('');
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [pendingUnlockNote, setPendingUnlockNote] = useState(null);
  
  const [isBackingUp, setIsBackingUp] = useState(false);

  // ==================== مسار النسخة الاحتياطية المؤقتة ====================
  const getTempBackupPath = () => {
    return FileSystem.documentDirectory + 'notes_backup_temp.json';
  };

  // ==================== دوال النسخ الاحتياطي في مجلد عام ====================

  // حفظ نسخة احتياطية ومشاركتها لحفظها في مجلد عام (مثل Downloads)
  const saveBackupToDevice = async () => {
    setIsBackingUp(true);
    try {
      const backup = {
        folders,
        trash,
        date: new Date().toISOString(),
        version: '2.0'
      };
      
      const tempPath = getTempBackupPath();
      await FileSystem.writeAsStringAsync(tempPath, JSON.stringify(backup, null, 2));
      
      // فتح خيار المشاركة لحفظ الملف في مجلد عام
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempPath, {
          dialogTitle: 'حفظ النسخة الاحتياطية',
          mimeType: 'application/json',
        });
        Alert.alert('✅ نجاح', 'تم إنشاء النسخة الاحتياطية. قم بحفظها في مجلد التحميلات (Downloads)');
      } else {
        Alert.alert('✅ نجاح', 'تم حفظ النسخة الاحتياطية مؤقتاً');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل حفظ النسخة الاحتياطية: ' + error.message);
    }
    setIsBackingUp(false);
  };

  // استعادة النسخة الاحتياطية من ملف تم اختياره يدوياً
  const restoreFromExternalManually = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });
      
      if (result.assets && result.assets[0]) {
        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const backup = JSON.parse(fileContent);
        
        Alert.alert(
          'استعادة النسخة الاحتياطية',
          `تاريخ النسخة: ${new Date(backup.date).toLocaleString('ar-SA')}\nسيتم استبدال الملاحظات الحالية. هل أنت متأكد؟`,
          [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'استعادة', onPress: () => restoreFromExternalBackup(backup) }
          ]
        );
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل قراءة الملف أو الملف غير صالح');
    }
  };

  // تنفيذ استعادة البيانات
  const restoreFromExternalBackup = async (backup) => {
    try {
      if (backup.folders) {
        setFolders(backup.folders);
        await AsyncStorage.setItem('@smart_folders_v15', JSON.stringify(backup.folders));
        
        // تحديث المجلد المفتوح إذا كان موجوداً
        if (selectedFolder && backup.folders) {
          const updatedFolder = backup.folders.find(f => f.id === selectedFolder.id);
          if (updatedFolder) {
            setSelectedFolder(updatedFolder);
            setNotes(updatedFolder.notes);
          }
        }
      }
      if (backup.trash) {
        setTrash(backup.trash);
        await AsyncStorage.setItem('@smart_trash_v13', JSON.stringify(backup.trash));
      }
      
      Alert.alert('✅ تم الاستعادة', 'تم استعادة ملاحظاتك السابقة بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل استعادة النسخة الاحتياطية');
    }
  };

  // البحث عن نسخة احتياطية عند أول تشغيل
  const checkForExternalBackup = async () => {
    Alert.alert(
      '📦 نسخة احتياطية',
      'هل لديك نسخة احتياطية محفوظة مسبقاً؟',
      [
        { text: 'لا، بدء جديد', onPress: () => createDefaultData() },
        { text: 'نعم، استعادة', onPress: () => restoreFromExternalManually() }
      ]
    );
    return true;
  };

  // إنشاء البيانات الافتراضية
  const createDefaultData = async () => {
    const defaultFolders = [
      { id: '1', name: 'العمل', color: COLORS[2], notes: [] },
      { id: '2', name: 'شخصي', color: COLORS[1], notes: [] },
    ];
    setFolders(defaultFolders);
    await AsyncStorage.setItem('@smart_folders_v15', JSON.stringify(defaultFolders));
    setTrash([]);
    await AsyncStorage.setItem('@smart_trash_v13', JSON.stringify([]));
  };

  // ==================== معالج زر الرجوع ====================
  useEffect(() => {
    const backAction = () => {
      if (selectedFolder) {
        setSelectedFolder(null);
        setNotes([]);
        setSearchQuery('');
        return true;
      } else if (noteViewVisible) {
        setNoteViewVisible(false);
        return true;
      } else if (editModalVisible) {
        setEditModalVisible(false);
        return true;
      } else if (showTrash) {
        setShowTrash(false);
        return true;
      } else if (showStats) {
        setShowStats(false);
        return true;
      } else if (lockModalVisible) {
        setLockModalVisible(false);
        setLockPasswordInput('');
        setUnlockPasswordInput('');
        setPendingUnlockNote(null);
        return true;
      } else if (folderModalVisible) {
        setFolderModalVisible(false);
        setEditingFolder(null);
        setNewFolderName('');
        return true;
      } else {
        BackHandler.exitApp();
        return true;
      }
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedFolder, noteViewVisible, editModalVisible, showTrash, showStats, lockModalVisible, folderModalVisible]);

  // تحميل البيانات عند بدء التطبيق
  useEffect(() => { 
    loadData(); 
    loadDarkMode(); 
  }, []);

  const loadData = async () => {
    try {
      const savedFolders = await AsyncStorage.getItem('@smart_folders_v15');
      if (savedFolders) {
        setFolders(JSON.parse(savedFolders));
      } else {
        // أول تشغيل - نبحث عن نسخة احتياطية
        await checkForExternalBackup();
      }
      const savedTrash = await AsyncStorage.getItem('@smart_trash_v13');
      if (savedTrash) setTrash(JSON.parse(savedTrash));
    } catch (error) {
      console.log('خطأ في تحميل البيانات:', error);
    }
  };

  const saveFolders = async (newFolders) => { await AsyncStorage.setItem('@smart_folders_v15', JSON.stringify(newFolders)); };
  const saveTrash = async (newTrash) => { await AsyncStorage.setItem('@smart_trash_v13', JSON.stringify(newTrash)); };
  
  const loadDarkMode = async () => { const saved = await AsyncStorage.getItem('@dark_mode'); if (saved !== null) setDarkMode(JSON.parse(saved)); };
  const toggleDarkMode = async () => { const newMode = !darkMode; setDarkMode(newMode); await AsyncStorage.setItem('@dark_mode', JSON.stringify(newMode)); };

  const addFolder = () => {
    if (!newFolderName.trim()) return Alert.alert('تنبيه', 'أدخل اسم المجلد');
    const newFolder = { id: Date.now().toString(), name: newFolderName.trim(), color: newFolderColor, notes: [] };
    const updated = [...folders, newFolder];
    setFolders(updated); saveFolders(updated);
    setNewFolderName(''); setFolderModalVisible(false);
    Alert.alert('تم', `تم إنشاء مجلد "${newFolderName}"`);
  };

  const deleteFolder = (id, name) => {
    Alert.alert('حذف مجلد', `حذف "${name}" سيحذف جميع الملاحظات`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', onPress: () => { const updated = folders.filter(f => f.id !== id); setFolders(updated); saveFolders(updated); if (selectedFolder?.id === id) setSelectedFolder(null); Alert.alert('تم', 'تم حذف المجلد'); } }
    ]);
  };

  const generateAutoTitle = (content) => {
    if (!content || content.trim() === '') return 'ملاحظة جديدة 📝';
    const firstLine = content.trim().split('\n')[0];
    if (firstLine.length > 30) return firstLine.substring(0, 30) + '...';
    return firstLine;
  };

  const addNote = () => {
    setCurrentNote({
      id: null, title: '', content: '', color: selectedFolder?.color || COLORS[0],
      tags: [], checklist: [], links: [], isLocked: false, lockPassword: '',
      isPinned: false, isFavorite: false
    });
    setChecklistItem('');
    setLinkInput('');
    setLinkName('');
    setEditModalVisible(true);
  };

  const viewNoteFullScreen = (note) => {
    if (note.isLocked) {
      setPendingUnlockNote(note);
      setUnlockPasswordInput('');
      setLockModalVisible(true);
    } else {
      setViewOnlyNote(note);
      setNoteViewVisible(true);
    }
  };

  const saveNote = () => {
    let finalTitle = currentNote.title;
    if (!finalTitle || finalTitle.trim() === '') {
      finalTitle = generateAutoTitle(currentNote.content);
    }
    
    const now = new Date().toLocaleDateString('ar-SA');
    let updatedFolders;
    if (currentNote.id) {
      updatedFolders = folders.map(f => f.id === selectedFolder.id ? { ...f, notes: f.notes.map(n => n.id === currentNote.id ? { ...currentNote, title: finalTitle, date: now } : n) } : f);
    } else {
      const newNote = { ...currentNote, title: finalTitle, id: Date.now().toString(), date: now };
      updatedFolders = folders.map(f => f.id === selectedFolder.id ? { ...f, notes: [newNote, ...f.notes] } : f);
    }
    setFolders(updatedFolders); saveFolders(updatedFolders);
    const updatedFolder = updatedFolders.find(f => f.id === selectedFolder.id);
    setSelectedFolder(updatedFolder); setNotes(updatedFolder.notes);
    setEditModalVisible(false);
    Alert.alert('تم', currentNote.id ? 'تم التعديل' : 'تم الإضافة');
  };

  const deleteNote = (noteId, fromView = false) => {
    Alert.alert('حذف', 'نقل إلى سلة المحذوفات؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'نقل', onPress: () => {
          const noteToDelete = notes.find(n => n.id === noteId);
          const noteWithFolder = { ...noteToDelete, originalFolderId: selectedFolder.id, originalFolderName: selectedFolder.name, deletedAt: new Date().toLocaleDateString('ar-SA') };
          const newTrash = [noteWithFolder, ...trash];
          setTrash(newTrash); saveTrash(newTrash);
          const updatedFolders = folders.map(f => f.id === selectedFolder.id ? { ...f, notes: f.notes.filter(n => n.id !== noteId) } : f);
          setFolders(updatedFolders); saveFolders(updatedFolders);
          const updatedFolder = updatedFolders.find(f => f.id === selectedFolder.id);
          setSelectedFolder(updatedFolder); setNotes(updatedFolder.notes);
          if (fromView) setNoteViewVisible(false);
          Alert.alert('تم', 'نقلت إلى سلة المحذوفات');
      }}
    ]);
  };

  const restoreNote = (noteId) => {
    const noteToRestore = trash.find(t => t.id === noteId);
    const originalFolder = folders.find(f => f.id === noteToRestore.originalFolderId);
    if (originalFolder) {
      const { originalFolderId, originalFolderName, deletedAt, ...cleanNote } = noteToRestore;
      const updated = folders.map(f => f.id === originalFolder.id ? { ...f, notes: [cleanNote, ...f.notes] } : f);
      setFolders(updated); saveFolders(updated);
      if (selectedFolder?.id === originalFolder.id) setSelectedFolder(updated.find(f => f.id === originalFolder.id));
    }
    const newTrash = trash.filter(t => t.id !== noteId);
    setTrash(newTrash); saveTrash(newTrash);
    Alert.alert('تم', 'تم استعادة الملاحظة');
  };

  const deletePermanent = (noteId) => {
    Alert.alert('حذف نهائي', 'لن تتمكن من الاستعادة', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', onPress: () => { const newTrash = trash.filter(t => t.id !== noteId); setTrash(newTrash); saveTrash(newTrash); Alert.alert('تم', 'تم الحذف'); } }
    ]);
  };

  const togglePinNote = (noteId, fromView = false) => {
    const updatedFolders = folders.map(f => f.id === selectedFolder.id ? {
      ...f,
      notes: f.notes.map(n => n.id === noteId ? { ...n, isPinned: !n.isPinned } : n)
    } : f);
    setFolders(updatedFolders); saveFolders(updatedFolders);
    const updatedFolder = updatedFolders.find(f => f.id === selectedFolder.id);
    setSelectedFolder(updatedFolder); setNotes(updatedFolder.notes);
    if (fromView && viewOnlyNote?.id === noteId) {
      setViewOnlyNote({ ...viewOnlyNote, isPinned: !viewOnlyNote.isPinned });
    }
  };

  const toggleFavoriteNote = (noteId, fromView = false) => {
    const updatedFolders = folders.map(f => f.id === selectedFolder.id ? {
      ...f,
      notes: f.notes.map(n => n.id === noteId ? { ...n, isFavorite: !n.isFavorite } : n)
    } : f);
    setFolders(updatedFolders); saveFolders(updatedFolders);
    const updatedFolder = updatedFolders.find(f => f.id === selectedFolder.id);
    setSelectedFolder(updatedFolder); setNotes(updatedFolder.notes);
    if (fromView && viewOnlyNote?.id === noteId) {
      setViewOnlyNote({ ...viewOnlyNote, isFavorite: !viewOnlyNote.isFavorite });
    }
  };

  const addLink = () => {
    if (!linkInput.trim()) return;
    const finalName = linkName.trim() || 'رابط';
    setCurrentNote({
      ...currentNote,
      links: [...currentNote.links, { url: linkInput.trim(), name: finalName, id: Date.now().toString() }]
    });
    setLinkInput('');
    setLinkName('');
  };

  const removeLink = (linkId) => {
    setCurrentNote({ ...currentNote, links: currentNote.links.filter(l => l.id !== linkId) });
  };

  const addChecklistItem = () => {
    if (!checklistItem.trim()) return;
    setCurrentNote({ ...currentNote, checklist: [...currentNote.checklist, { text: checklistItem.trim(), checked: false, id: Date.now().toString() }] });
    setChecklistItem('');
  };

  const toggleChecklistItem = (id) => {
    setCurrentNote({ ...currentNote, checklist: currentNote.checklist.map(i => i.id === id ? { ...i, checked: !i.checked } : i) });
  };

  const removeChecklistItem = (id) => {
    setCurrentNote({ ...currentNote, checklist: currentNote.checklist.filter(i => i.id !== id) });
  };

  const shareNote = async (note) => {
    try {
      let shareText = `${note.title}\n\n${note.content}\n\n`;
      if (note.checklist?.length > 0) {
        shareText += `\n✅ المهام:\n`;
        note.checklist.forEach(i => shareText += `${i.checked ? '✓' : '○'} ${i.text}\n`);
      }
      if (note.links?.length > 0) {
        shareText += `\n🔗 روابط:\n`;
        note.links.forEach(l => shareText += `• ${l.name}: ${l.url}\n`);
      }
      await Share.share({ message: shareText, title: note.title });
    } catch (error) {}
  };

  const showLockSetup = () => {
    setLockPasswordInput('');
    setLockModalVisible(true);
  };

  const confirmSetPassword = () => {
    if (!lockPasswordInput.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال كلمة المرور');
      return;
    }
    setCurrentNote({ ...currentNote, isLocked: true, lockPassword: lockPasswordInput });
    setLockModalVisible(false);
    setLockPasswordInput('');
    Alert.alert('تم', 'تم قفل الملاحظة بكلمة مرور');
  };

  const confirmUnlock = () => {
    if (!pendingUnlockNote) return;
    if (unlockPasswordInput === pendingUnlockNote.lockPassword || unlockPasswordInput === DEFAULT_PASSWORD) {
      setViewOnlyNote(pendingUnlockNote);
      setNoteViewVisible(true);
      setLockModalVisible(false);
      setUnlockPasswordInput('');
      setPendingUnlockNote(null);
    } else {
      Alert.alert('خطأ', 'كلمة المرور غير صحيحة');
      setUnlockPasswordInput('');
    }
  };

  const getStats = () => {
    let totalNotes = 0, totalWords = 0, totalChecklists = 0, totalLinks = 0;
    let pinnedCount = 0, favoriteCount = 0;
    folders.forEach(f => {
      totalNotes += f.notes.length;
      f.notes.forEach(n => { 
        totalWords += (n.content || '').split(' ').length; 
        totalChecklists += n.checklist?.length || 0;
        totalLinks += n.links?.length || 0;
        if (n.isPinned) pinnedCount++;
        if (n.isFavorite) favoriteCount++;
      });
    });
    return { totalNotes, totalFolders: folders.length, totalWords, totalChecklists, totalLinks, totalTrash: trash.length, pinnedCount, favoriteCount };
  };
  const stats = getStats();

  const colors = {
    background: darkMode ? '#1a1a2e' : '#f5f5f5',
    cardBg: darkMode ? '#16213e' : '#ffffff',
    text: darkMode ? '#eeeeee' : '#333333',
    textSecondary: darkMode ? '#aaaaaa' : '#666666',
    border: darkMode ? '#0f3460' : '#e0e0e0',
    primary: '#6c63ff',
    success: '#10b981',
    danger: '#ff6b6b',
    warning: '#f59e0b',
  };

  const getSortedNotes = () => {
    const sorted = [...notes];
    return sorted.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  };

  const renderFolder = ({ item }) => (
    <TouchableOpacity style={[styles.folderCard, { backgroundColor: item.color.bg, borderColor: colors.border }]} onPress={() => { setSelectedFolder(item); setNotes(item.notes); }} onLongPress={() => { Vibration.vibrate(50); Alert.alert(item.name, 'اختر', [{ text: 'تعديل', onPress: () => { setEditingFolder(item); setNewFolderName(item.name); setNewFolderColor(item.color); setFolderModalVisible(true); } }, { text: 'حذف', onPress: () => deleteFolder(item.id, item.name), style: 'destructive' }, { text: 'إلغاء' }]); }} activeOpacity={0.7}>
      <Text style={{ fontSize: 40 }}>{item.color.icon}</Text>
      <Text style={[styles.folderName, { color: item.color.text }]}>{item.name}</Text>
      <Text style={[styles.folderCount, { color: item.color.text + '99' }]}>{item.notes.length} ملاحظات</Text>
    </TouchableOpacity>
  );

  const renderNote = ({ item }) => (
    <TouchableOpacity style={[styles.noteCard, { backgroundColor: item.color?.bg || colors.cardBg, borderColor: colors.border, borderWidth: item.isPinned ? 2 : 1 }]} onPress={() => viewNoteFullScreen(item)} onLongPress={() => deleteNote(item.id)} activeOpacity={0.7}>
      <View style={styles.noteHeader}>
        <View style={styles.noteTags}>{item.tags?.slice(0,2).map(t => <View key={t} style={styles.noteTag}><Text>{TAGS.find(tg => tg.id === t)?.icon}</Text></View>)}</View>
        <View style={styles.noteIcons}>
          {item.isPinned && <Text style={{ fontSize: 14, marginLeft: 5 }}>📌</Text>}
          {item.isFavorite && <Text style={{ fontSize: 14, marginLeft: 5 }}>⭐</Text>}
          {item.isLocked && <Text style={{ fontSize: 14, marginLeft: 5 }}>🔒</Text>}
        </View>
      </View>
      <Text style={[styles.noteTitle, { color: item.color?.text || colors.text }]}>{item.title}</Text>
      <Text style={[styles.noteContent, { color: (item.color?.text || colors.text) + 'cc' }]} numberOfLines={2}>{item.content}</Text>
      {item.links?.length > 0 && <Text style={[styles.noteMeta, { color: (item.color?.text || colors.text) + '99' }]}>🔗 {item.links.length} رابط</Text>}
      <Text style={[styles.noteDate, { color: (item.color?.text || colors.text) + '99' }]}>{item.date}</Text>
    </TouchableOpacity>
  );

  const filteredNotes = () => {
    if (!searchQuery) return getSortedNotes();
    return getSortedNotes().filter(n => n.title.includes(searchQuery) || n.content.includes(searchQuery));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      
      <Modal visible={lockModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.lockModal, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.lockTitle, { color: colors.text }]}>
              {pendingUnlockNote ? '🔓 فتح الملاحظة' : '🔒 قفل الملاحظة'}
            </Text>
            <TextInput
              style={[styles.lockInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder={pendingUnlockNote ? "أدخل كلمة المرور" : "أدخل كلمة المرور"}
              secureTextEntry
              value={pendingUnlockNote ? unlockPasswordInput : lockPasswordInput}
              onChangeText={pendingUnlockNote ? setUnlockPasswordInput : setLockPasswordInput}
              textAlign="center"
              autoFocus
            />
            <TouchableOpacity style={[styles.lockConfirmBtn, { backgroundColor: colors.primary }]} onPress={pendingUnlockNote ? confirmUnlock : confirmSetPassword}>
              <Text style={styles.lockConfirmText}>{pendingUnlockNote ? 'فتح' : 'قفل'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setLockModalVisible(false); setLockPasswordInput(''); setUnlockPasswordInput(''); setPendingUnlockNote(null); }}>
              <Text style={{ color: colors.danger, marginTop: 15, textAlign: 'center' }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <Modal visible={noteViewVisible} transparent={false} animationType="slide">
        <View style={[styles.fullScreenView, { backgroundColor: viewOnlyNote?.color?.bg || colors.background }]}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity onPress={() => { setNoteViewVisible(false); }} style={styles.backButton}>
              <Text style={{ fontSize: 24, color: viewOnlyNote?.color?.text || colors.text }}>✖</Text>
            </TouchableOpacity>
            <Text style={[styles.fullScreenTitle, { color: viewOnlyNote?.color?.text || colors.text }]}>{viewOnlyNote?.title}</Text>
            <View style={styles.fullScreenActions}>
              <TouchableOpacity onPress={() => togglePinNote(viewOnlyNote?.id, true)} style={styles.actionIcon}>
                <Text style={{ fontSize: 22, color: viewOnlyNote?.isPinned ? colors.warning : colors.text }}>📌</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleFavoriteNote(viewOnlyNote?.id, true)} style={styles.actionIcon}>
                <Text style={{ fontSize: 22, color: viewOnlyNote?.isFavorite ? colors.warning : colors.text }}>⭐</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => shareNote(viewOnlyNote)} style={styles.actionIcon}><Text style={{ fontSize: 22 }}>📤</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setNoteViewVisible(false); setCurrentNote(viewOnlyNote); setEditModalVisible(true); }} style={styles.actionIcon}><Text style={{ fontSize: 22 }}>✏️</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => deleteNote(viewOnlyNote?.id, true)} style={styles.actionIcon}><Text style={{ fontSize: 22 }}>🗑️</Text></TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.fullScreenContent}>
            <Text style={[styles.fullScreenText, { color: (viewOnlyNote?.color?.text || colors.text) + 'cc', lineHeight: 28, fontSize: 18 }]}>
              {viewOnlyNote?.content || 'لا يوجد محتوى'}
            </Text>
            {viewOnlyNote?.checklist?.length > 0 && (
              <View style={[styles.fullScreenChecklist, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.fullScreenChecklistTitle, { color: viewOnlyNote?.color?.text || colors.text }]}>✅ المهام:</Text>
                {viewOnlyNote.checklist.map(i => (
                  <Text key={i.id} style={[styles.fullScreenChecklistItem, { color: (viewOnlyNote?.color?.text || colors.text) + '99', textDecorationLine: i.checked ? 'line-through' : 'none' }]}>
                    {i.checked ? '✓' : '○'} {i.text}
                  </Text>
                ))}
              </View>
            )}
            {viewOnlyNote?.links?.length > 0 && (
              <View style={[styles.fullScreenLinks, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.fullScreenLinksTitle, { color: viewOnlyNote?.color?.text || colors.text }]}>🔗 روابط:</Text>
                {viewOnlyNote.links.map(link => (
                  <View key={link.id} style={styles.linkItem}>
                    <Text>🔗</Text>
                    <Text style={[styles.linkName, { color: (viewOnlyNote?.color?.text || colors.text) + 'cc' }]}>{link.name}</Text>
                    <Text style={[styles.linkUrl, { color: (viewOnlyNote?.color?.text || colors.text) + '99' }]} numberOfLines={1}>{link.url}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.fullScreenDate, { color: (viewOnlyNote?.color?.text || colors.text) + '99' }]}>
              📅 {viewOnlyNote?.date}
            </Text>
          </ScrollView>
        </View>
      </Modal>
      
      <View style={styles.header}>
        <View><Text style={[styles.headerTitle, { color: colors.text }]}>{selectedFolder ? `📁 ${selectedFolder.name}` : '📚 ملاحظات'}</Text><Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{selectedFolder ? `${filteredNotes().length} ملاحظة` : `${folders.length} مجلد`}</Text></View>
        <View style={styles.headerButtons}>
          {selectedFolder && <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} style={styles.iconBtn}><Text style={{ fontSize: 22 }}>{viewMode === 'grid' ? '☷' : '▦'}</Text></TouchableOpacity>}
          <TouchableOpacity onPress={toggleDarkMode} style={styles.iconBtn}><Text>{darkMode ? '☀️' : '🌙'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowStats(!showStats)} style={styles.iconBtn}><Text>📊</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowTrash(!showTrash)} style={styles.iconBtn}><Text>{showTrash ? '📝' : '🗑️'}</Text></TouchableOpacity>
          {selectedFolder && <TouchableOpacity onPress={() => { setSelectedFolder(null); setSearchQuery(''); }} style={styles.iconBtn}><Text>📂</Text></TouchableOpacity>}
        </View>
      </View>
      
      {selectedFolder && !showTrash && !showStats && (
        <View style={[styles.searchBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text>🔍</Text>
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="بحث..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      )}
      
      {showStats && (
        <View style={[styles.statsCard, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>📊 إحصائيات</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}><Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalNotes}</Text><Text>ملاحظات</Text></View>
            <View style={styles.statItem}><Text style={[styles.statNumber, { color: colors.success }]}>{stats.totalFolders}</Text><Text>مجلدات</Text></View>
            <View style={styles.statItem}><Text style={[styles.statNumber, { color: colors.warning }]}>{stats.totalWords}</Text><Text>كلمات</Text></View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}><Text style={[styles.statNumber, { color: '#8b5cf6' }]}>{stats.totalChecklists}</Text><Text>مهام</Text></View>
            <View style={styles.statItem}><Text style={[styles.statNumber, { color: '#ec4899' }]}>{stats.totalLinks}</Text><Text>روابط</Text></View>
            <View style={styles.statItem}><Text style={[styles.statNumber, { color: colors.danger }]}>{stats.totalTrash}</Text><Text>محذوفة</Text></View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}><Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.pinnedCount}</Text><Text>مثبتة</Text></View>
            <View style={styles.statItem}><Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.favoriteCount}</Text><Text>مفضلة</Text></View>
          </View>
        </View>
      )}
      
      {showTrash ? (
        trash.length === 0 ? (
          <View style={styles.emptyContainer}><Text style={{ fontSize: 48 }}>🗑️</Text><Text style={{ color: colors.textSecondary }}>سلة فارغة</Text></View>
        ) : (
          <FlatList data={trash} keyExtractor={i => i.id} renderItem={({ item }) => (
            <View style={[styles.trashItem, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.trashTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={{ color: colors.textSecondary }}>حذفت: {item.deletedAt}</Text>
              <View style={styles.trashActions}>
                <TouchableOpacity onPress={() => restoreNote(item.id)} style={styles.restoreBtn}><Text>↩️ استعادة</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => deletePermanent(item.id)} style={styles.deletePermBtn}><Text>🗑️ حذف</Text></TouchableOpacity>
              </View>
            </View>
          )} contentContainerStyle={styles.listContainer} />
        )
      ) : !selectedFolder ? (
        folders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48 }}>📂</Text>
            <Text style={{ color: colors.textSecondary }}>لا توجد مجلدات</Text>
            <TouchableOpacity onPress={() => setFolderModalVisible(true)} style={styles.emptyButton}><Text style={styles.emptyButtonText}>+ مجلد جديد</Text></TouchableOpacity>
          </View>
        ) : (
          <FlatList key={`folders-${viewMode}`} data={folders} keyExtractor={i => i.id} renderItem={renderFolder} numColumns={2} contentContainerStyle={styles.listContainer} />
        )
      ) : (
        filteredNotes().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48 }}>📝</Text>
            <Text style={{ color: colors.textSecondary }}>{searchQuery ? 'لا نتائج' : 'لا ملاحظات'}</Text>
            {!searchQuery && <TouchableOpacity onPress={addNote} style={styles.emptyButton}><Text style={styles.emptyButtonText}>+ أضف ملاحظة</Text></TouchableOpacity>}
          </View>
        ) : (
          <FlatList key={`notes-${viewMode}`} data={filteredNotes()} keyExtractor={i => i.id} renderItem={renderNote} numColumns={viewMode === 'grid' ? 2 : 1} contentContainerStyle={styles.listContainer} />
        )
      )}
      
      <TouchableOpacity style={styles.fab} onPress={selectedFolder ? addNote : () => setFolderModalVisible(true)}><Text style={styles.fabText}>+</Text></TouchableOpacity>
      
      {/* أزرار النسخ الاحتياطي والاستعادة في الشاشة الرئيسية */}
      {!selectedFolder && !showTrash && !showStats && (
        <View style={{ position: 'absolute', bottom: 25, left: 25, flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[styles.backupBtn, { backgroundColor: colors.primary }]} onPress={saveBackupToDevice}>
            <Text style={styles.backupBtnText}>💾 نسخ احتياطي</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backupBtn, { backgroundColor: colors.warning }]} onPress={restoreFromExternalManually}>
            <Text style={styles.backupBtnText}>📁 استعادة</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <Modal visible={folderModalVisible} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentSmall, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingFolder ? '✏️ تعديل مجلد' : '📁 مجلد جديد'}</Text>
            <ScrollView horizontal><View style={{ flexDirection: 'row' }}>{COLORS.map(c => (<TouchableOpacity key={c.id} style={[styles.colorOption, { backgroundColor: c.bg, borderWidth: newFolderColor.id === c.id ? 3 : 1, borderColor: newFolderColor.id === c.id ? colors.primary : '#ccc' }]} onPress={() => setNewFolderColor(c)}><Text style={{ fontSize: 30 }}>{c.icon}</Text></TouchableOpacity>))}</View></ScrollView>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="اسم المجلد" value={newFolderName} onChangeText={setNewFolderName} textAlign="right" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#64748b' }]} onPress={() => { setFolderModalVisible(false); setEditingFolder(null); setNewFolderName(''); }}><Text style={styles.modalBtnText}>إلغاء</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={editingFolder ? () => { const updated = folders.map(f => f.id === editingFolder.id ? { ...f, name: newFolderName.trim(), color: newFolderColor } : f); setFolders(updated); saveFolders(updated); setFolderModalVisible(false); setEditingFolder(null); setNewFolderName(''); Alert.alert('تم', 'تم التعديل'); } : addFolder}><Text style={styles.modalBtnText}>{editingFolder ? 'تعديل' : 'إنشاء'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <Modal visible={editModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{currentNote.id ? '✏️ تعديل ملاحظة' : '➕ ملاحظة جديدة'}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}><Text style={{ fontSize: 24, color: colors.danger }}>✖</Text></TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>🎨 اللون:</Text>
              <ScrollView horizontal><View style={{ flexDirection: 'row' }}>{COLORS.map(c => (<TouchableOpacity key={c.id} style={[styles.colorOptionSmall, { backgroundColor: c.bg, borderWidth: currentNote.color?.id === c.id ? 3 : 1, borderColor: currentNote.color?.id === c.id ? colors.primary : '#ccc' }]} onPress={() => setCurrentNote({ ...currentNote, color: c })}><Text>{c.icon}</Text></TouchableOpacity>))}</View></ScrollView>
              
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>🏷️ التصنيفات:</Text>
              <ScrollView horizontal><View style={{ flexDirection: 'row' }}>{TAGS.map(t => (<TouchableOpacity key={t.id} style={[styles.tagOption, { backgroundColor: currentNote.tags?.includes(t.id) ? colors.primary : colors.background, borderColor: colors.border }]} onPress={() => { const newTags = currentNote.tags?.includes(t.id) ? currentNote.tags.filter(tt => tt !== t.id) : [...(currentNote.tags || []), t.id]; setCurrentNote({ ...currentNote, tags: newTags }); }}><Text>{t.icon}</Text><Text style={{ color: currentNote.tags?.includes(t.id) ? '#fff' : colors.text, marginLeft: 5 }}>{t.name}</Text></TouchableOpacity>))}</View></ScrollView>
              
              <View style={styles.rowIcons}>
                <TouchableOpacity onPress={() => setCurrentNote({ ...currentNote, isPinned: !currentNote.isPinned })} style={styles.iconRowBtn}>
                  <Text style={{ fontSize: 22, color: currentNote.isPinned ? colors.warning : colors.text }}>📌</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>تثبيت</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCurrentNote({ ...currentNote, isFavorite: !currentNote.isFavorite })} style={styles.iconRowBtn}>
                  <Text style={{ fontSize: 22, color: currentNote.isFavorite ? colors.warning : colors.text }}>⭐</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>مفضلة</Text>
                </TouchableOpacity>
              </View>
              
              <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="العنوان (اختياري)" value={currentNote.title} onChangeText={text => setCurrentNote({ ...currentNote, title: text })} />
              
              <TextInput style={[styles.inputContentLarge, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, textAlignVertical: 'top', minHeight: 150 }]} placeholder="المحتوى..." value={currentNote.content} onChangeText={text => setCurrentNote({ ...currentNote, content: text })} multiline />
              
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>🔗 روابط:</Text>
              <TextInput style={[styles.inputSmall, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="اسم الرابط (اختياري)" value={linkName} onChangeText={setLinkName} />
              <View style={styles.linkInputRow}>
                <TextInput style={[styles.inputLink, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="رابط (مثال: https://...)" value={linkInput} onChangeText={setLinkInput} />
                <TouchableOpacity onPress={addLink} style={[styles.addLinkBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#fff' }}>➕</Text></TouchableOpacity>
              </View>
              
              {currentNote.links?.map(link => (
                <View key={link.id} style={styles.linkRow}>
                  <Text>🔗</Text>
                  <Text style={[styles.linkText, { color: colors.text, flex: 1 }]} numberOfLines={1}>{link.name}: {link.url}</Text>
                  <TouchableOpacity onPress={() => removeLink(link.id)}><Text style={{ color: colors.danger, fontSize: 18 }}>🗑️</Text></TouchableOpacity>
                </View>
              ))}
              
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>✅ مهام:</Text>
              {currentNote.checklist?.map(i => (<View key={i.id} style={styles.checklistItem}><TouchableOpacity onPress={() => toggleChecklistItem(i.id)}><Text style={{ fontSize: 20, marginRight: 10 }}>{i.checked ? '✅' : '⬜'}</Text></TouchableOpacity><Text style={[styles.checklistText, { color: colors.text, textDecorationLine: i.checked ? 'line-through' : 'none' }]}>{i.text}</Text><TouchableOpacity onPress={() => removeChecklistItem(i.id)}><Text style={{ color: colors.danger }}>🗑️</Text></TouchableOpacity></View>))}
              <View style={styles.addChecklist}><TextInput style={[styles.checklistInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="أضف مهمة..." value={checklistItem} onChangeText={setChecklistItem} /><TouchableOpacity onPress={addChecklistItem} style={[styles.addChecklistBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#fff' }}>إضافة</Text></TouchableOpacity></View>
              
              <View style={styles.lockRow}>
                <Text style={{ color: colors.text }}>🔒 قفل الملاحظة</Text>
                <Switch value={currentNote.isLocked} onValueChange={(val) => { if (val) showLockSetup(); else setCurrentNote({ ...currentNote, isLocked: false, lockPassword: '' }); }} trackColor={{ false: colors.border, true: colors.primary }} />
              </View>
            </ScrollView>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#64748b', flex: 1 }]} onPress={() => setEditModalVisible(false)}><Text style={styles.modalBtnText}>إلغاء</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 2 }]} onPress={saveNote}><Text style={styles.modalBtnText}>💾 حفظ الملاحظة</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, marginTop: 3 },
  headerButtons: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 15, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 25, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 16, padding: 0, textAlign: 'right' },
  listContainer: { paddingHorizontal: 15, paddingBottom: 80 },
  folderCard: { flex: 1, margin: 8, padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, minHeight: 140 },
  folderName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  folderCount: { fontSize: 12 },
  noteCard: { marginBottom: 10, padding: 15, borderRadius: 15, borderWidth: 1 },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  noteTags: { flexDirection: 'row', gap: 4 },
  noteTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
  noteIcons: { flexDirection: 'row' },
  noteTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  noteContent: { fontSize: 13, marginBottom: 8, textAlign: 'right', lineHeight: 18 },
  noteMeta: { fontSize: 11, marginBottom: 4, textAlign: 'right' },
  noteDate: { fontSize: 10, textAlign: 'right' },
  statsCard: { marginHorizontal: 20, marginBottom: 15, padding: 15, borderRadius: 15 },
  statsTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold' },
  trashItem: { marginBottom: 10, padding: 15, borderRadius: 15, borderWidth: 1 },
  trashTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginBottom: 5 },
  trashActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  restoreBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#10b981', borderRadius: 8 },
  deletePermBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ef4444', borderRadius: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyButton: { marginTop: 20, backgroundColor: '#6c63ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  emptyButtonText: { color: '#fff', fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 25, right: 25, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  backupBtn: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 25 },
  backupBtnText: { color: '#fff', fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContentSmall: { borderRadius: 20, padding: 20 },
  modalContentLarge: { borderRadius: 20, padding: 20, maxHeight: '85%' },
  modalScroll: { maxHeight: '70%' },
  inputContentLarge: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, height: 150, textAlign: 'right' },
  inputSmall: { borderWidth: 1, borderRadius: 12, padding: 10, fontSize: 14, marginBottom: 8, textAlign: 'right' },
  inputLink: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, fontSize: 14, textAlign: 'right' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', flex: 1 },
  modalLabel: { fontSize: 14, marginBottom: 8, textAlign: 'right', fontWeight: 'bold' },
  modalButtonsContainer: { flexDirection: 'row', gap: 10, marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ddd' },
  
  colorOption: { width: 55, height: 55, borderRadius: 27, marginRight: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  colorOptionSmall: { width: 45, height: 45, borderRadius: 22, marginRight: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  tagOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 15, textAlign: 'right' },
  checklistItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checklistText: { flex: 1, fontSize: 14, textAlign: 'right' },
  addChecklist: { flexDirection: 'row', marginBottom: 15 },
  checklistInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, textAlign: 'right', marginRight: 8 },
  addChecklistBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  lockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 5 },
  modalBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  rowIcons: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 15 },
  iconRowBtn: { alignItems: 'center', padding: 8 },
  
  linkInputRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  addLinkBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', padding: 8, borderRadius: 8, marginBottom: 5, gap: 8 },
  linkText: { fontSize: 12 },
  
  fullScreenView: { flex: 1 },
  fullScreenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  backButton: { padding: 5 },
  fullScreenTitle: { fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  fullScreenActions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' },
  actionIcon: { padding: 5 },
  fullScreenContent: { flex: 1, padding: 20 },
  fullScreenText: { marginBottom: 20, textAlign: 'right' },
  fullScreenChecklist: { marginTop: 10, marginBottom: 20, padding: 15, borderRadius: 15 },
  fullScreenChecklistTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'right' },
  fullScreenChecklistItem: { marginBottom: 8, textAlign: 'right' },
  fullScreenLinks: { marginTop: 10, marginBottom: 20, padding: 15, borderRadius: 15 },
  fullScreenLinksTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'right' },
  linkItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  linkName: { fontWeight: 'bold' },
  linkUrl: { flex: 1 },
  fullScreenDate: { textAlign: 'center', marginTop: 20, paddingBottom: 30 },
  
  lockModal: { padding: 25, borderRadius: 20, alignItems: 'center', width: '100%' },
  lockTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  lockInput: { width: '100%', borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 20 },
  lockConfirmBtn: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, width: '100%', alignItems: 'center' },
  lockConfirmText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
