import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import {
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CaretDownIcon,
} from '../atoms/Icon';

const { width: screenWidth } = Dimensions.get('window');
const scale = (size: number) => (screenWidth / 375) * size;

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  initialDate?: Date | null;
  minDate?: Date;
  maxDate?: Date;
  title?: string;
}

const stripTime = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialDate,
  minDate,
  maxDate,
  title = 'Select Date',
}) => {
  const today = useMemo(() => stripTime(new Date()), []);
  const defaultDate = initialDate ? stripTime(initialDate) : today;

  const [viewYear, setViewYear] = useState(defaultDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(defaultDate.getMonth());
  const [selected, setSelected] = useState<Date>(defaultDate);
  // 'days' shows the calendar grid, 'years' shows a quick year picker
  const [mode, setMode] = useState<'days' | 'years'>('days');

  // Reset internal state whenever the modal re-opens
  useEffect(() => {
    if (visible) {
      const d = initialDate ? stripTime(initialDate) : today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelected(d);
      setMode('days');
    }
  }, [visible, initialDate, today]);

  const minD = minDate ? stripTime(minDate) : undefined;
  const maxD = maxDate ? stripTime(maxDate) : undefined;

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let day = 1; day <= totalDays; day++) {
      cells.push(new Date(viewYear, viewMonth, day));
    }
    // Pad to complete weeks for a tidy grid
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isDisabled = (d: Date) => {
    if (minD && d < minD) return true;
    if (maxD && d > maxD) return true;
    return false;
  };

  const handleSelectDay = (d: Date) => {
    if (isDisabled(d)) return;
    setSelected(d);
  };

  const handleConfirm = () => {
    onConfirm(selected);
  };

  // Year picker: show 12-year window centered around current viewYear
  const yearWindow = useMemo(() => {
    const start = viewYear - 6;
    return Array.from({ length: 12 }, (_, i) => start + i);
  }, [viewYear]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.card}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon size={scale(20)} />
            </TouchableOpacity>
          </View>

          {/* Selected date display */}
          <View style={styles.selectedRow}>
            <Text style={styles.selectedYear}>{selected.getFullYear()}</Text>
            <Text style={styles.selectedDay}>
              {selected.toLocaleString('en-US', { weekday: 'short' })}, {MONTH_NAMES[selected.getMonth()].slice(0, 3)} {selected.getDate()}
            </Text>
          </View>

          {/* Month/Year nav */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={goPrevMonth} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronLeftIcon size={scale(18)} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode(mode === 'days' ? 'years' : 'days')}
              style={styles.monthYearBtn}
            >
              <Text style={styles.monthYearText}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <View style={styles.caretSpacing}>
                <CaretDownIcon size={scale(12)} expanded={mode !== 'days'} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={goNextMonth} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronRightIcon size={scale(18)} color="#1A2151" />
            </TouchableOpacity>
          </View>

          {mode === 'days' ? (
            <>
              {/* Weekday labels */}
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} style={styles.weekLabel}>
                    {w}
                  </Text>
                ))}
              </View>

              {/* Day grid */}
              <View style={styles.grid}>
                {daysInMonth.map((d, idx) => {
                  if (!d) {
                    return <View key={`empty-${idx}`} style={styles.cell} />;
                  }
                  const disabled = isDisabled(d);
                  const isToday = isSameDay(d, today);
                  const isSelected = isSameDay(d, selected);
                  return (
                    <TouchableOpacity
                      key={d.toISOString()}
                      style={[
                        styles.cell,
                        isSelected && styles.cellSelected,
                      ]}
                      onPress={() => handleSelectDay(d)}
                      disabled={disabled}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isToday && !isSelected && styles.cellTextToday,
                          isSelected && styles.cellTextSelected,
                          disabled && styles.cellTextDisabled,
                        ]}
                      >
                        {d.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.yearGrid}>
              {yearWindow.map((y) => {
                const isCurrent = y === viewYear;
                return (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearCell, isCurrent && styles.yearCellSelected]}
                    onPress={() => {
                      setViewYear(y);
                      setMode('days');
                    }}
                  >
                    <Text style={[styles.yearText, isCurrent && styles.yearTextSelected]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Footer actions */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={[styles.footerBtn, styles.cancelBtn]}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={[styles.footerBtn, styles.confirmBtn]}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const CELL_SIZE = (screenWidth - scale(40) - scale(40)) / 7;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 17, 43, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(20),
    paddingHorizontal: scale(20),
    paddingTop: scale(18),
    paddingBottom: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  headerTitle: {
    fontSize: scale(15),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  selectedRow: {
    paddingVertical: scale(8),
    marginBottom: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  selectedYear: {
    fontSize: scale(12),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  selectedDay: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
    marginTop: scale(2),
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(6),
  },
  navArrow: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
  },
  monthYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(6),
    paddingHorizontal: scale(10),
  },
  monthYearText: {
    fontSize: scale(14),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  caretSpacing: {
    marginLeft: scale(4),
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scale(4),
    marginBottom: scale(4),
  },
  weekLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: scale(11),
    color: '#8E8E93',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellSelected: {
    backgroundColor: '#1A2151',
    borderRadius: CELL_SIZE / 2,
  },
  cellText: {
    fontSize: scale(13),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  cellTextToday: {
    color: '#85B82B',
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  cellTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  cellTextDisabled: {
    color: '#D1D1D6',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: scale(8),
  },
  yearCell: {
    width: '30%',
    paddingVertical: scale(12),
    marginVertical: scale(4),
    borderRadius: scale(10),
    backgroundColor: '#F8F9FC',
    alignItems: 'center',
  },
  yearCellSelected: {
    backgroundColor: '#1A2151',
  },
  yearText: {
    fontSize: scale(13),
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Medium',
  },
  yearTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  footer: {
    flexDirection: 'row',
    marginTop: scale(10),
    gap: scale(10),
  },
  footerBtn: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F2F2F7',
  },
  cancelBtnText: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#1A2151',
    fontFamily: 'BricolageGrotesque-Bold',
  },
  confirmBtn: {
    backgroundColor: '#1A2151',
  },
  confirmBtnText: {
    fontSize: scale(13),
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'BricolageGrotesque-Bold',
  },
});

export default DatePickerModal;
