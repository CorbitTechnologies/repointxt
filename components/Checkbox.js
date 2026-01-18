import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

const Checkbox = ({ label, checked, onPress }) => {
  const { colors, borderRadius, spacing } = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.6}
      >
        <View style={[
          styles.box,
          {
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : colors.surface,
            borderRadius: 6,
            marginRight: spacing.md
          }
        ]}>
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.label, { color: colors.text, fontWeight: checked ? '700' : '600' }]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  box: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  label: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
});

export default Checkbox;