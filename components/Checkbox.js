import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

const Checkbox = ({ label, checked, onPress }) => {
  const { colors, spacing, isDark } = useTheme();

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
            borderColor: colors.text,
            backgroundColor: checked ? colors.text : 'transparent',
            borderRadius: 4,
            marginRight: 10
          }
        ]}>
          {checked && <Icon name="check" size={12} color={isDark ? '#000' : '#fff'} />}
        </View>
        <Text style={[styles.label, { color: colors.text, fontWeight: checked ? '700' : '600' }]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  box: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
});

export default Checkbox;