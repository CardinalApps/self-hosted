import { useState, useEffect, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

import Card from '../../layout/Card'
import Loading from '../../layout/Loading'
import Checkbox from '../../forms/Checkbox'

import { settingsSelectors } from '../../../store/slices/settings'

import homeServerAPI from '../../../lib/homeserver/homeServerAPI'
import { queryParams } from '../../../lib/net/queryParams'

import i18n from './i18n'

import './DirectoryTree.css'

export type TreeNode = {
  path: string,
  name: string,
  size?: number,
  type: "directory" | "file",
  extension?: string,
  children?: Array<TreeNode>,
}

type DirectoryTreeProps = {
  title?: string,
  multi?: boolean,
  initialPaths?: TreeNode,
  rootDir?: 'music' | 'photos' | 'movies' | 'tv',
  portal?: boolean,
  selectDirectory?: boolean,
  selectFile?: boolean,
  style?: Record<string, unknown>,
  onSelect?: (node: TreeNode | TreeNode[] | undefined, tree: TreeNode) => void,
  onClick?: (node: TreeNode, tree: TreeNode) => void,
  onExpand?: (node: TreeNode, tree: TreeNode, insertNodes: (nodes) => void) => void,
  onCollapse?: (node: TreeNode, tree: TreeNode, insertNodes: (nodes) => void) => void,
}

/**
 * Browse folders in a directory tree.
 * 
 * @param selectDirectory - Enables directory selection.
 * @param selectFile - Enables file selection. selectDirectory must also be enabled.
 */
const DirectoryTree = ({
  title,
  multi = false,
  initialPaths,
  rootDir,
  portal = false,
  selectDirectory = false,
  selectFile = false,
  style = {},
  onSelect,
  onClick,
  onExpand,
  onCollapse,
}: PropsWithChildren<DirectoryTreeProps>) => {
  const tree = useRef<TreeNode>(initialPaths)
  const [selected, setSelected] = useState<TreeNode | TreeNode[] | undefined>(multi ? [] : undefined)
  const { lang } = useSelector(settingsSelectors.current)
  const [, setRerender] = useState<number>()
  const rerender = () => setRerender(Math.random())
  const numSelected = multi
    ? Array.isArray(selected) ? selected.length : 0
    : selected ? 1 : 0

  /**
   * Optionally use the global sidebar.
   */
  const maybeUsePortal = (children) => {
    if (portal) {
      const el = document.querySelector('#file-browser-sidebar-portal')
      if (el) {
        return createPortal(children, el)
      } else {
        return children
      }
    } else {
      return children
    }
  }

  /**
   * Fetch directories from a Media Server.
   */
  const fetchDirs = (path?): Promise<TreeNode> => {
    return new Promise((resolve) => {
      homeServerAPI(queryParams('/ls', { rootDir: rootDir ? rootDir : '', path: path ? path : '' }))
        .then((res) => {
          resolve(res as TreeNode)
        })
        .catch((error) => {
          console.error(error)
        })
    })
  }

  /**
   * By default, fetch the child directories of the clicked directory from the
   * /ls endpoint. If an onExpand function is given, call it instead and insert
   * the child nodes that it returns.
   */
  const handleExpand = (child) => {
    child.children = [{ type: 'loadingNode' }]
    rerender()
    if (typeof onExpand === 'function') {
      onExpand?.(child, tree.current, (insert) => {
        child.children = insert
        rerender()
      })
    } else {
      fetchDirs(child.path).then((res) => {
        child.children = res.children
        rerender()
      })
    }
  }

  /**
   * Collapse a directory by deleting its children.
   */
  const handleCollapse = (dir) => {
    if (typeof onCollapse === 'function') {
      onCollapse?.(dir, tree.current, (treeAfterCollapse) => {
        tree.current = treeAfterCollapse
        rerender()
      })
    } else {
      delete dir.children
      rerender()
    }
  }

  /**
   * Returns the icon for a list item.
   */
  const getIcon = (child) => {
    if (child.type === 'directory') {
      if (child?.children?.length) {
        return (
          <button
            className="icon-button"
            onClick={() => handleCollapse(child)}
          >
            <i className="icon far fa-folder-open" />
          </button>
        )
      }
      if (!child?.children?.length) {
        return (
          <button
            className="icon-button"
            onClick={() => handleExpand(child)}
          >
            <i className="icon far fa-folder" />
          </button>
        )
      }
    }

    if (child.type === 'file') {
      return (
        <button className="icon-button">
          <i className="icon far fa-file" />
        </button>
      )
    }
  }

  /**
   * Checks if the given menu item is currently selected.
   */
  const isItemSelected = (item, checkParent = false) => {
    if (selected) {
      if (checkParent) {
        if (multi) {
          return !!(selected as TreeNode[]).find((selected) => item.path.includes(selected.path))
        } else {
          return item.path.includes((selected as TreeNode).path)
        }
      } else {
        if (multi) {
          return !!(selected as TreeNode[]).find((selected) => selected.path === item.path)
        } else {
          return (selected as TreeNode).path === item.path
        }
      }
    } else {
      return false
    }
  }

  /**
   * Recursively build the tree with all of the given paths.
   */
  const renderTree = (children?) => {
    // Show loading icon while we have nothing at all
    if (!children && !tree.current) {
      return (
        <li className="loading-dirs">
          /<Loading size="s" />
        </li>
      )
    }
    // If we are at the top
    if (!children && tree.current) {
      return (
        <li className="root-dir" data-type={tree.current.type}>
          /{tree.current?.name}
          {!!tree.current.children?.length && <ol>{renderTree(tree.current.children)}</ol>}
        </li>
      )
    }
    // Second level and lower
    else if (children) {
      return children.map((child) => {
        if (child.type === 'emptyNode') {
          return (
            <li
              key="empty-node"
              data-type="empty-node"
              className="empty-node"
            >
              <p>{i18n['empty-dir'][lang]}</p>
            </li>
          )
        } else if (child.type === 'loadingNode') {
          return (
            <li
              key="loading-node"
              data-type="loading-node"
              className="loading-node"
            >
              <p>
                <Loading size="s" inline={true} />
                <span className="loading-text">{i18n['loading-dir'][lang]}</span>
              </p>
            </li>
          )
        } else {
          return (
            <li
              key={child.name}
              data-type={child.type}
              className={clsx(isItemSelected(child) ? 'selected' : '')}
              title={child.name}
            >
              <div className="dir">
                <div className="text">
                  {getIcon(child)}
                  <button
                    className="path-button"
                    onClick={() => {
                      // Handle directory click
                      if (child.type === 'directory') {
                        if (child?.children) {
                          handleCollapse(child)
                        } else {
                          handleExpand(child)
                        }
                      }
                      // Handle file click
                      else if (child.type === 'file') {
                        onClick?.(child, tree.current)
                      }
                    }}
                  >
                    {child.name}
                  </button>
                </div>
                <div className="select-dir">
                  {!!selectDirectory
                    && (
                      child.type === 'directory'
                      || (child.type === 'file' && !!selectFile)
                    )
                    && (
                      <Checkbox
                        checked={isItemSelected(child, true)}
                        onChange={(checked) => {
                          if (multi) {
                            if (checked) {
                              setSelected([...(selected as TreeNode[]), child])
                            } else {
                              setSelected([...(selected as TreeNode[])].filter((v) => v !== child))
                            }
                          } else {
                            if (checked) {
                              setSelected(child)
                            } else {
                              setSelected(undefined)
                            }
                          }
                        }}
                      />
                    )
                  }
                </div>
              </div>
              {!!child.children?.length && <ol>{renderTree(child.children)}</ol>}
            </li>
          )
        }
      })
    }
  }

  /**
   * Init top level.
   */
  useEffect(() => {
    if (initialPaths) {
      tree.current = initialPaths
      rerender()
    } else if (rootDir) {
      fetchDirs().then((dirs) => {
        tree.current = dirs
        rerender()
      })
    }
  }, [rootDir])

  /**
   * Propagate select.
   */
  useEffect(() => {
    onSelect?.(selected, tree.current)
  }, [selected])

  /**
   * Allow the initial state to be changed externally.
   */
  useEffect(() => {
    if (tree.current !== initialPaths) {
      tree.current = initialPaths
      rerender()
    }
  }, [initialPaths])

  return maybeUsePortal(
    <Card className="directory-tree" padding={'none'} style={style}>
      <header>
        {!!title && <p className="directory-tree-title">{title}</p>}
        <div className="directory-tree-controls">
          <div>
            {i18n['selected-path.label'][lang].replace('{num}', numSelected)}
          </div>
        </div>
      </header>
      <ol
        className={clsx('directory-list')}
        data-can-select-dirs={selectDirectory ? 'true' : 'false'}
      >
        {renderTree()}
      </ol>
    </Card>,
  )
}

export default DirectoryTree
