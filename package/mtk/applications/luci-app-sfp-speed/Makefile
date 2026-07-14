# SPDX-License-Identifier: GPL-2.0-only

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-sfp-speed
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only

LUCI_TITLE:=LuCI support for RTL837x SFP speed control
LUCI_MAINTAINER:=ItsLucas <itslucas@itslucas.me>
LUCI_DEPENDS:=+luci-base +rpcd +jshn +swconfig +kmod-switch-rtl837x +kmod-sfp
LUCI_PKGARCH:=all

define Build/Prepare/$(PKG_NAME)
	chmod 0755 $(PKG_BUILD_DIR)/root/etc/init.d/sfp-speed
	chmod 0755 $(PKG_BUILD_DIR)/root/usr/sbin/sfp-speed-control
	chmod 0755 $(PKG_BUILD_DIR)/root/usr/libexec/rpcd/luci.sfp_speed
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
